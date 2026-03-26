from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.core.deps import get_db, get_current_user
from app import models

router = APIRouter(prefix="/validations", tags=["Validations"])


class ValidationCreate(BaseModel):
    idAlerte: str
    decision: str = Field(pattern="^(FRAUDE|LEGITIME)$")
    commentaire: str = Field(min_length=3, max_length=500)


@router.post("")
def create_validation(
    data: ValidationCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    alerte = db.query(models.Alerte).filter(models.Alerte.idalerte == data.idAlerte).first()
    if not alerte:
        raise HTTPException(status_code=404, detail="Alerte introuvable")

    if alerte.statut == "CLOTUREE":
        raise HTTPException(status_code=400, detail="Alerte déjà clôturée")

    # créer validation (traçabilité entreprise)
    v = models.Validation(
        decision=data.decision,
        commentaire=data.commentaire,
        idalerte=alerte.idalerte,
        iduser=current_user.iduser,
    )
    db.add(v)

    # mettre à jour alerte
    alerte.statut = "CLOTUREE"
    alerte.date_cloture = datetime.now(timezone.utc)

    # mettre à jour transaction
    tx = alerte.transaction
    if tx:
        if data.decision == "FRAUDE":
            tx.statut = "REFUSEE"
        else:
            tx.statut = "ACCEPTEE"

    db.commit()
    db.refresh(v)

    return {
        "idValidation": str(v.idval),
        "alerte": str(alerte.idalerte),
        "decision": v.decision,
        "statut_alerte": alerte.statut,
        "statut_transaction": tx.statut if tx else None,
    }