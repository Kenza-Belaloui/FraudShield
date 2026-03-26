from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app import models
from app.api.auth import router as auth_router
from app.api.transactions import router as transactions_router
from app.api.alerts import router as alerts_router
from app.api.dashboard import router as dashboard_router
from fastapi.middleware.cors import CORSMiddleware
from app.api.validations import router as validations_router
import random
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException

app = FastAPI(title="FraudShield API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(transactions_router)
app.include_router(alerts_router)
app.include_router(dashboard_router)
app.include_router(validations_router)

# DB dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/health")
def health():
    return {"status": "ok"}

from app.core.deps import get_current_user

@app.get("/roles/count")
def count_roles(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    count = db.query(models.Role).count()
    return {"roles_count": count}


@app.post("/setup/seed-roles")
def seed_roles(db: Session = Depends(get_db)):
    default_roles = ["ADMIN", "ANALYSTE", "RESP_RISQUE"]
    created = 0

    for r in default_roles:
        exists = db.query(models.Role).filter(models.Role.nom == r).first()
        if not exists:
            db.add(models.Role(nom=r))
            created += 1

    db.commit()
    return {"created": created}

from app.core.security import hash_password

@app.post("/setup/seed-admin")
def seed_admin(db: Session = Depends(get_db)):
    # Vérifie que le rôle ADMIN existe
    role_admin = db.query(models.Role).filter(models.Role.nom == "ADMIN").first()
    if not role_admin:
        return {"error": "Role ADMIN introuvable. Lance d'abord /setup/seed-roles"}

    # Vérifie si admin existe déjà
    existing = db.query(models.Utilisateur).filter(models.Utilisateur.email == "admin@fraudshield.com").first()
    if existing:
        return {"message": "Admin existe déjà"}

    user = models.Utilisateur(
        nom_complet="Admin FraudShield",
        email="admin@fraudshield.com",
        mot_de_passe_hash=hash_password("Admin123!"),
        actif=True,
        idr=role_admin.idr
    )
    db.add(user)
    db.commit()
    return {"message": "Admin créé", "email": user.email, "password": "Admin123!"}

from datetime import datetime, timezone

@app.post("/setup/seed-demo-data")
def seed_demo_data(db: Session = Depends(get_db)):
    # client
    client = db.query(models.Client).filter(models.Client.reference_externe == "CLT-0001").first()
    if not client:
        client = models.Client(nom="Dupont", prenom="Amine", reference_externe="CLT-0001", segment="STANDARD")
        db.add(client)
        db.commit()
        db.refresh(client)

    # carte
    carte = db.query(models.Carte).filter(models.Carte.pan_masque == "4970********7890").first()
    if not carte:
        carte = models.Carte(
            pan_masque="4970********7890",
            emetteur="VISA",
            mois_expiration=8,
            annee_expiration=2029,
            idclient=client.idclient
        )
        db.add(carte)
        db.commit()
        db.refresh(carte)

    # commercant
    commercant = db.query(models.Commercant).filter(models.Commercant.nom == "TechStore Paris").first()
    if not commercant:
        commercant = models.Commercant(nom="TechStore Paris", categorie="Electronics", pays="France", ville="Paris")
        db.add(commercant)
        db.commit()
        db.refresh(commercant)

    return {
        "client": str(client.idclient),
        "carte": str(carte.idcarte),
        "commercant": str(commercant.idcommercant)
    }


from app.services.fraud_engine import evaluate_transaction
from app.services.feature_store import compute_behavior_features
from app.services.reason_codes import build_reason_codes


def _rand_amount():
    buckets = [(5, 40), (40, 150), (150, 400), (400, 1200), (1200, 3000)]
    a, b = random.choice(buckets)
    return round(random.uniform(a, b), 2)


def _rand_canal():
    return random.choice(["POS", "E_COMMERCE", "DAB"])


@app.post("/setup/seed-demo-transactions")
def seed_demo_transactions(count: int = 50, db: Session = Depends(get_db)):
    client = db.query(models.Client).first()
    carte = db.query(models.Carte).first()
    commercant = db.query(models.Commercant).first()

    if not client or not carte or not commercant:
        raise HTTPException(status_code=400, detail="Lance /setup/seed-demo-data d'abord.")

    created = 0
    now = datetime.now(timezone.utc)

    for _ in range(count):
        dt = now - timedelta(
            days=random.randint(0, 6),
            hours=random.randint(0, 23),
            minutes=random.randint(0, 59),
        )

        montant = _rand_amount()
        canal = _rand_canal()

        # rendre un peu de fraude plus probable sur gros montant e-commerce
        if canal == "E_COMMERCE" and montant > 800 and random.random() < 0.35:
            montant = round(montant * random.uniform(1.1, 1.8), 2)

        t = models.Transaction(
            date_heure=dt,
            montant=montant,
            devise="EUR",
            canal=canal,
            statut="EN_ATTENTE",
            idclient=client.idclient,
            idcarte=carte.idcarte,
            idcommercant=commercant.idcommercant,
        )
        db.add(t)
        db.commit()
        db.refresh(t)

        features = compute_behavior_features(
            db=db,
            client_id=t.idclient,
            carte_id=t.idcarte,
            commercant_id=t.idcommercant,
            montant=float(t.montant),
            date_heure=t.date_heure,
            commercant_pays=commercant.pays,
        )

        decision = evaluate_transaction(
            montant=float(t.montant),
            canal=t.canal,
            pays=commercant.pays,
            ml_features=features,
        )

        reason_codes = build_reason_codes(
            features=features,
            score_xgb=float(decision.score_xgb),
            score_iforest=float(decision.score_iforest),
        )

        t.features = features
        t.reason_codes = reason_codes

        pred_xgb = models.PredictionModele(
            nom_modele="XGBoost",
            version_modele="real-v1",
            score_risque=float(decision.score_xgb),
            est_anomalie=False,
            seuil=None,
            idtransac=t.idtransac,
        )
        pred_if = models.PredictionModele(
            nom_modele="IsolationForest",
            version_modele="real-v1",
            score_risque=float(decision.score_iforest),
            est_anomalie=(float(decision.score_iforest) >= 0.5),
            seuil=None,
            idtransac=t.idtransac,
        )

        db.add(pred_xgb)
        db.add(pred_if)
        db.commit()
        db.refresh(pred_xgb)

        alerte = models.Alerte(
            criticite=decision.criticite,
            statut="OUVERTE",
            raison=decision.raison,
            idtransac=t.idtransac,
            idmod=pred_xgb.idmod,
        )
        db.add(alerte)

        # statut tx cohérent pour l'UI
        t.statut = "EN_ATTENTE" if decision.criticite == "ELEVE" else "ACCEPTEE"
        db.add(t)
        db.commit()

        created += 1

    return {"created": created}


@app.post("/setup/simulate-flux")
def simulate_flux(count: int = 30, db: Session = Depends(get_db)):
    return seed_demo_transactions(count=count, db=db)