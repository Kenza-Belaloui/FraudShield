from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List
from uuid import UUID
import random

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import desc, or_
from sqlalchemy.orm import Session

from app import models
from app.core.deps import get_current_user, get_db
from app.services.feature_store import compute_behavior_features
from app.services.fraud_engine import evaluate_transaction
from app.services.reason_codes import build_reason_codes

router = APIRouter(prefix="/transactions", tags=["Transactions"])


class TransactionCreate(BaseModel):
    idClient: UUID
    idCarte: UUID
    idCommercant: UUID
    date_heure: datetime
    montant: float = Field(gt=0)
    devise: str = "EUR"
    canal: str
    statut: str


@router.get("")
def list_transactions(
    page: int = 1,
    page_size: int = 20,
    q: str | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    page = max(page, 1)
    page_size = min(max(page_size, 1), 100)

    query = db.query(models.Transaction)

    if q:
        s = q.strip()
        query = (
            query.join(models.Client, models.Transaction.idclient == models.Client.idclient)
            .join(models.Commercant, models.Transaction.idcommercant == models.Commercant.idcommercant)
            .filter(
                or_(
                    models.Client.nom.ilike(f"%{s}%"),
                    models.Client.prenom.ilike(f"%{s}%"),
                    models.Commercant.nom.ilike(f"%{s}%"),
                    models.Transaction.idtransac.cast(models.String).ilike(f"%{s}%"),
                )
            )
        )

    qdb = query.order_by(desc(models.Transaction.date_heure))
    total = qdb.count()
    rows = qdb.offset((page - 1) * page_size).limit(page_size).all()

    items = []

    for t in rows:
        alerte = getattr(t, "alerte", None)

        score_final = None
        if alerte and getattr(alerte, "prediction_principale", None):
            score_final = float(alerte.prediction_principale.score_risque)

        items.append({
            "idTransac": str(t.idtransac),
            "date_heure": t.date_heure.isoformat(),
            "montant": float(t.montant),
            "devise": t.devise,
            "canal": t.canal,
            "statut": t.statut,
            "client": {
                "nom": t.client.nom,
                "prenom": t.client.prenom,
            } if getattr(t, "client", None) else None,
            "commercant": {
                "nom": t.commercant.nom,
            } if getattr(t, "commercant", None) else None,
            "alerte": {
                "idAlerte": str(alerte.idalerte) if alerte else None,
                "criticite": alerte.criticite if alerte else None,
                "statut": alerte.statut if alerte else None,
                "score_final": score_final,
            },
            "features": getattr(t, "features", None),
            "reason_codes": getattr(t, "reason_codes", None),
        })

    return {"items": items, "page": page, "page_size": page_size, "total": total}


@router.post("")
def create_transaction(
    data: TransactionCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    commercant = (
        db.query(models.Commercant)
        .filter(models.Commercant.idcommercant == data.idCommercant)
        .first()
    )
    pays = commercant.pays if commercant else None

    t = models.Transaction(
        date_heure=data.date_heure,
        montant=data.montant,
        devise=data.devise,
        canal=data.canal,
        statut=data.statut,
        idclient=data.idClient,
        idcarte=data.idCarte,
        idcommercant=data.idCommercant,
    )
    db.add(t)
    db.commit()
    db.refresh(t)

    features: Dict[str, Any] = compute_behavior_features(
        db=db,
        client_id=t.idclient,
        carte_id=t.idcarte,
        commercant_id=t.idcommercant,
        montant=float(t.montant),
        date_heure=t.date_heure,
        commercant_pays=pays,
    )

    decision = evaluate_transaction(
        montant=float(t.montant),
        canal=t.canal,
        pays=pays,
        ml_features=features,
    )

    reason_codes: List[str] = build_reason_codes(
        features=features,
        score_xgb=float(decision.score_xgb),
        score_iforest=float(decision.score_iforest),
    )

    t.features = features
    t.reason_codes = reason_codes
    db.add(t)
    db.commit()
    db.refresh(t)

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
    db.commit()
    db.refresh(alerte)

    return {
        "idTransac": str(t.idtransac),
        "idAlerte": str(alerte.idalerte),
        "mode": "REAL_ML",
        "score_final": float(decision.score_final),
        "score_xgb": float(decision.score_xgb),
        "score_iforest": float(decision.score_iforest),
        "criticite": decision.criticite,
        "raison": decision.raison,
        "reason_codes": reason_codes,
        "features": features,
        "message": "Transaction analysée",
    }


@router.post("/simulate")
def simulate_transactions(
    count: int = 30,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    count = max(1, min(count, 200))

    client = db.query(models.Client).filter(models.Client.reference_externe == "CLT-0001").first()
    if not client:
        client = models.Client(
            nom="Dupont",
            prenom="Amine",
            reference_externe="CLT-0001",
            segment="STANDARD",
            pays_residence="France",
            revenu_mensuel_estime=3200,
            plafond_carte_journalier=1500,
        )
        db.add(client)
        db.commit()
        db.refresh(client)

    carte = db.query(models.Carte).filter(models.Carte.pan_masque == "4970********7890").first()
    if not carte:
        carte = models.Carte(
            pan_masque="4970********7890",
            emetteur="VISA",
            mois_expiration=8,
            annee_expiration=2029,
            idclient=client.idclient,
        )
        db.add(carte)
        db.commit()
        db.refresh(carte)

    commercant = db.query(models.Commercant).filter(models.Commercant.nom == "TechStore Paris").first()
    if not commercant:
        commercant = models.Commercant(
            nom="TechStore Paris",
            categorie="Electronics",
            pays="France",
            ville="Paris",
        )
        db.add(commercant)
        db.commit()
        db.refresh(commercant)

    created = 0
    elev = 0
    now = datetime.now(timezone.utc)

    for _ in range(count):
        montant = round(random.uniform(5, 2500), 2)
        canal = random.choice(["POS", "E_COMMERCE", "DAB"])
        statut = random.choice(["ACCEPTEE", "ACCEPTEE", "ACCEPTEE", "EN_ATTENTE", "REFUSEE"])
        dt = now - timedelta(minutes=random.randint(0, 60 * 48))

        payload = TransactionCreate(
            idClient=client.idclient,
            idCarte=carte.idcarte,
            idCommercant=commercant.idcommercant,
            date_heure=dt,
            montant=montant,
            devise="EUR",
            canal=canal,
            statut=statut,
        )

        res = create_transaction(payload, db=db, current_user=current_user)
        created += 1
        if res.get("criticite") == "ELEVE":
            elev += 1

    return {"created": created, "elev_count": elev, "message": "Simulation terminée"}


@router.get("/{idtransac}")
def get_transaction(
    idtransac: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    t = db.query(models.Transaction).filter(models.Transaction.idtransac == idtransac).first()
    if not t:
        raise HTTPException(status_code=404, detail="Transaction introuvable")

    alerte = getattr(t, "alerte", None)
    score_final = None
    if alerte and getattr(alerte, "prediction_principale", None):
        score_final = float(alerte.prediction_principale.score_risque)

    return {
        "idTransac": str(t.idtransac),
        "date_heure": t.date_heure.isoformat(),
        "montant": float(t.montant),
        "devise": t.devise,
        "canal": t.canal,
        "statut": t.statut,
        "client": {
            "nom": t.client.nom,
            "prenom": t.client.prenom,
        } if t.client else None,
        "commercant": {
            "nom": t.commercant.nom,
            "categorie": t.commercant.categorie,
            "pays": t.commercant.pays,
            "ville": t.commercant.ville,
        } if t.commercant else None,
        "alerte": {
            "idAlerte": str(alerte.idalerte) if alerte else None,
            "criticite": alerte.criticite if alerte else None,
            "statut": alerte.statut if alerte else None,
            "score_final": score_final,
            "raison": alerte.raison if alerte else None,
        } if alerte else None,
        "features": getattr(t, "features", None),
        "reason_codes": getattr(t, "reason_codes", None),
    }