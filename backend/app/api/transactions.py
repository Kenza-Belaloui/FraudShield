from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc
from pydantic import BaseModel, Field
from datetime import datetime
from uuid import UUID

from app.core.deps import get_db, get_current_user
from app import models
from app.services.fraud_engine import evaluate_transaction

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
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if page < 1:
        page = 1
    if page_size < 1:
        page_size = 20
    if page_size > 100:
        page_size = 100

    q = db.query(models.Transaction).order_by(desc(models.Transaction.date_heure))
    total = q.count()
    rows = q.offset((page - 1) * page_size).limit(page_size).all()

    items = []
    for t in rows:
        alerte = t.alerte
        score_final = None

        if alerte and alerte.prediction_principale:
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
                "prenom": t.client.prenom
            },
            "commercant": {
                "nom": t.commercant.nom
            },
            "alerte": {
                "criticite": alerte.criticite if alerte else None,
                "statut": alerte.statut if alerte else None,
                "score_final": score_final
            }
        })

    return {
        "items": items,
        "page": page,
        "page_size": page_size,
        "total": total
    }


# ===============================
#   CREATE TRANSACTION + SCORING
# ===============================

@router.post("")
def create_transaction(
    data: TransactionCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # 1️⃣ Créer la transaction
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

    # 2️⃣ Récupérer pays du commerçant
    commercant = db.query(models.Commercant).filter(
        models.Commercant.idcommercant == t.idcommercant
    ).first()

    pays = commercant.pays if commercant else None

    # 3️⃣ Scoring mock (2 modèles simulés)
    decision = evaluate_transaction(
        montant=float(t.montant),
        canal=t.canal,
        pays=pays
    )

    # 4️⃣ Créer prédictions
    pred_xgb = models.PredictionModele(
        nom_modele="XGBoost",
        version_modele="mock-v1",
        score_risque=decision.score_xgb,
        est_anomalie=False,
        seuil=0.7,
        idtransac=t.idtransac,
    )

    pred_if = models.PredictionModele(
        nom_modele="IsolationForest",
        version_modele="mock-v1",
        score_risque=decision.score_iforest,
        est_anomalie=(decision.score_iforest >= 0.7),
        seuil=0.7,
        idtransac=t.idtransac,
    )

    db.add(pred_xgb)
    db.add(pred_if)
    db.commit()
    db.refresh(pred_xgb)

    # 5️⃣ Créer 1 alerte par transaction
    alerte = models.Alerte(
        criticite=decision.criticite,
        statut="OUVERTE",
        raison=decision.raison,
        idtransac=t.idtransac,
        idmod=pred_xgb.idmod
    )

    db.add(alerte)
    db.commit()

    return {
        "idTransac": str(t.idtransac),
        "score_final": decision.score_final,
        "criticite": decision.criticite,
        "message": "Transaction analysée (mock scoring)"
    }

