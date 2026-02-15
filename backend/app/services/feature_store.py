from datetime import timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func

from app import models


def compute_features(
    db: Session,
    idclient,
    idcarte,
    idcommercant,
    tx_time,
):
    """
    Feature Store comportemental (V1):
    - nb_tx_client_1h
    - nb_tx_client_24h
    - avg_amount_client_7j
    - depasse_plafond (KYC)
    - pays_inhabituel (KYC vs commerçant)
    """
    # Fenêtres temporelles
    t_1h = tx_time - timedelta(hours=1)
    t_24h = tx_time - timedelta(hours=24)
    t_7j = tx_time - timedelta(days=7)

    # ----------- features client (transactions passées) -----------
    nb_tx_client_1h = db.query(func.count(models.Transaction.idtransac)).filter(
        models.Transaction.idclient == idclient,
        models.Transaction.date_heure >= t_1h,
        models.Transaction.date_heure < tx_time
    ).scalar() or 0

    nb_tx_client_24h = db.query(func.count(models.Transaction.idtransac)).filter(
        models.Transaction.idclient == idclient,
        models.Transaction.date_heure >= t_24h,
        models.Transaction.date_heure < tx_time
    ).scalar() or 0

    avg_amount_client_7j = db.query(func.avg(models.Transaction.montant)).filter(
        models.Transaction.idclient == idclient,
        models.Transaction.date_heure >= t_7j,
        models.Transaction.date_heure < tx_time
    ).scalar()
    avg_amount_client_7j = float(avg_amount_client_7j) if avg_amount_client_7j is not None else 0.0

    # ----------- KYC-based features -----------
    client = db.query(models.Client).filter(models.Client.idclient == idclient).first()
    commercant = db.query(models.Commercant).filter(models.Commercant.idcommercant == idcommercant).first()

    plafond = float(client.plafond_carte_journalier) if client and client.plafond_carte_journalier else None
    pays_res = (client.pays_residence.lower() if client and client.pays_residence else None)
    pays_com = (commercant.pays.lower() if commercant and commercant.pays else None)

    # depasse plafond sera calculé au moment du scoring (avec le montant)
    pays_inhabituel = 0
    if pays_res and pays_com and pays_res != pays_com:
        pays_inhabituel = 1

    return {
        "nb_tx_client_1h": int(nb_tx_client_1h),
        "nb_tx_client_24h": int(nb_tx_client_24h),
        "avg_amount_client_7j": float(avg_amount_client_7j),
        "plafond_carte_journalier": plafond,
        "pays_inhabituel": int(pays_inhabituel),
    }
