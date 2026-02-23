from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app import models
from app.api.auth import router as auth_router
from app.api.transactions import router as transactions_router
from app.api.alerts import router as alerts_router
from app.api.dashboard import router as dashboard_router

app = FastAPI(title="FraudShield API", version="1.0.0")

app.include_router(auth_router)
app.include_router(transactions_router)
app.include_router(alerts_router)
app.include_router(dashboard_router)

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
