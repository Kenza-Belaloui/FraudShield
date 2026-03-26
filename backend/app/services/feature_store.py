from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models


def compute_behavior_features(
    db: Session,
    *,
    client_id,
    carte_id,
    commercant_id,
    montant: float,
    date_heure: datetime,
    commercant_pays: Optional[str] = None,
) -> Dict[str, Any]:
    client = (
        db.query(models.Client)
        .filter(models.Client.idclient == client_id)
        .first()
    )

    client_pays = getattr(client, "pays_residence", None) if client else None
    plafond = float(getattr(client, "plafond_carte_journalier", 0) or 0) if client else 0.0
    revenu = float(getattr(client, "revenu_mensuel_estime", 0) or 0) if client else 0.0
    segment = getattr(client, "segment", None) if client else "STANDARD"

    start_24h = date_heure - timedelta(hours=24)
    start_7d = date_heure - timedelta(days=7)

    nb_tx_24h = (
        db.query(func.count(models.Transaction.idtransac))
        .filter(models.Transaction.idclient == client_id)
        .filter(models.Transaction.date_heure >= start_24h)
        .scalar()
    ) or 0

    avg_amount_7d = (
        db.query(func.avg(models.Transaction.montant))
        .filter(models.Transaction.idclient == client_id)
        .filter(models.Transaction.date_heure >= start_7d)
        .scalar()
    )
    avg_amount_7d = float(avg_amount_7d) if avg_amount_7d is not None else 0.0

    heure = date_heure.hour
    heure_nuit = 1 if 0 <= heure <= 5 else 0

    is_pays_inhabituel = 0
    if commercant_pays and client_pays and commercant_pays.strip().lower() != client_pays.strip().lower():
        is_pays_inhabituel = 1

    depasse_plafond = 1 if (plafond > 0 and montant > plafond) else 0
    ratio_revenu = float(montant) / float(revenu) if revenu > 0 else 0.0

    # mapping simple du canal vers pseudo-type paysim enrichi
    canal = ""
    tx = (
        db.query(models.Transaction)
        .filter(models.Transaction.idclient == client_id)
        .filter(models.Transaction.idcommercant == commercant_id)
        .order_by(models.Transaction.date_heure.desc())
        .first()
    )
    if tx:
        canal = (tx.canal or "").upper()

    is_transfer = 1 if canal == "E_COMMERCE" else 0
    is_cash_out = 1 if canal == "DAB" else 0
    is_payment = 1 if canal == "POS" else 0
    is_cash_in = 0
    is_debit = 1 if canal in {"POS", "E_COMMERCE", "DAB"} else 0

    # dans l'app réelle on n'a pas old/new balance -> défaut neutre
    balance_error_orig = 0.0
    balance_error_dest = 0.0
    isFlaggedFraud = 0

    return {
        "Amount": float(montant),
        "client_segment": segment or "STANDARD",
        "client_pays": client_pays or "France",
        "client_revenu_mensuel": float(revenu),
        "client_plafond_journalier": float(plafond),
        "nb_tx_24h": int(nb_tx_24h),
        "avg_amount_7d": float(avg_amount_7d),
        "heure_nuit": int(heure_nuit),
        "is_pays_inhabituel": int(is_pays_inhabituel),
        "depasse_plafond": int(depasse_plafond),
        "ratio_revenu": float(ratio_revenu),
        "balance_error_orig": float(balance_error_orig),
        "balance_error_dest": float(balance_error_dest),
        "is_transfer": int(is_transfer),
        "is_cash_out": int(is_cash_out),
        "is_payment": int(is_payment),
        "is_cash_in": int(is_cash_in),
        "is_debit": int(is_debit),
        "isFlaggedFraud": int(isFlaggedFraud),
    }