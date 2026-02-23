from datetime import datetime, timedelta
from typing import Any, Dict, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

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
    """
    Feature store comportemental (MVP pro):
    - nb_tx_24h (client)
    - avg_amount_7d (client)
    - heure_nuit (0/1)
    - is_pays_inhabituel (0/1) => pays marchand != pays client
    - depasse_plafond (0/1) => montant > plafond_journalier client
    """

    # --- Client ---
    client = (
        db.query(models.Client)
        .filter(models.Client.idclient == client_id)
        .first()
    )

    client_pays = getattr(client, "pays", None) if client else None
    plafond = float(getattr(client, "plafond_journalier", 0) or 0) if client else 0.0
    revenu = float(getattr(client, "revenu_mensuel", 0) or 0) if client else 0.0
    segment = getattr(client, "segment", None) if client else None

    # --- Fenêtres temporelles ---
    start_24h = date_heure - timedelta(hours=24)
    start_7d = date_heure - timedelta(days=7)

    # --- nb_tx_24h ---
    nb_tx_24h = (
        db.query(func.count(models.Transaction.idtransac))
        .filter(models.Transaction.idclient == client_id)
        .filter(models.Transaction.date_heure >= start_24h)
        .scalar()
    ) or 0

    # --- avg_amount_7d ---
    avg_amount_7d = (
        db.query(func.avg(models.Transaction.montant))
        .filter(models.Transaction.idclient == client_id)
        .filter(models.Transaction.date_heure >= start_7d)
        .scalar()
    )
    avg_amount_7d = float(avg_amount_7d) if avg_amount_7d is not None else 0.0

    # --- heure_nuit ---
    heure = date_heure.hour
    heure_nuit = 1 if (0 <= heure <= 5) else 0

    # --- pays inhabituel ---
    is_pays_inhabituel = 0
    if commercant_pays and client_pays and commercant_pays != client_pays:
        is_pays_inhabituel = 1

    # --- dépasse plafond ---
    depasse_plafond = 1 if (plafond > 0 and montant > plafond) else 0

    # (Optionnel) ratio par rapport au revenu mensuel
    ratio_revenu = 0.0
    if revenu > 0:
        ratio_revenu = float(montant) / float(revenu)

    return {
        "client_id": str(client_id),
        "client_segment": segment,
        "client_pays": client_pays,
        "client_revenu_mensuel": revenu,
        "client_plafond_journalier": plafond,

        "nb_tx_24h": int(nb_tx_24h),
        "avg_amount_7d": float(avg_amount_7d),
        "heure_nuit": int(heure_nuit),
        "is_pays_inhabituel": int(is_pays_inhabituel),
        "depasse_plafond": int(depasse_plafond),
        "ratio_revenu": float(ratio_revenu),
    }