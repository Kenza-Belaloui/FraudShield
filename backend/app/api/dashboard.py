from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta, timezone

from app.core.deps import get_db, get_current_user
from app import models

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/summary")
def dashboard_summary(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    now = datetime.now(timezone.utc)
    since_24h = now - timedelta(hours=24)
    since_7d = now - timedelta(days=7)

    # Transactions 24h
    transactions_24h = db.query(func.count(models.Transaction.idtransac))\
        .filter(models.Transaction.date_heure >= since_24h)\
        .scalar() or 0

    # Alertes actives
    alertes_actives = db.query(func.count(models.Alerte.idalerte))\
        .filter(models.Alerte.statut == "OUVERTE")\
        .scalar() or 0

    # Taux fraude 7j = alertes ELEVE / tx (approx pro)
    total_tx_7d = db.query(func.count(models.Transaction.idtransac))\
        .filter(models.Transaction.date_heure >= since_7d)\
        .scalar() or 0

    fraud_alerts_7d = db.query(func.count(models.Alerte.idalerte))\
        .filter(models.Alerte.date_creation >= since_7d)\
        .filter(models.Alerte.criticite == "ELEVE")\
        .scalar() or 0

    taux_fraude_7j = (fraud_alerts_7d / total_tx_7d * 100.0) if total_tx_7d else 0.0

    # Temps moyen d'analyse (si tu as ce champ, sinon fallback 120ms)
    # Ici on met simple: pas de champ => 120
    temps_moyen_analyse_ms = 120

    # Distribution criticité 7j
    rows = db.query(models.Alerte.criticite, func.count(models.Alerte.idalerte))\
        .filter(models.Alerte.date_creation >= since_7d)\
        .group_by(models.Alerte.criticite)\
        .all()

    criticite_distribution_7j = {c: int(n) for c, n in rows}

    # Recent alerts
    recent = db.query(models.Alerte)\
        .order_by(models.Alerte.date_creation.desc())\
        .limit(7)\
        .all()

    recent_alerts = []
    for a in recent:
        score_final = None
        if a.transaction and a.transaction.alerte and a.transaction.alerte.prediction_principale:
            score_final = float(a.transaction.alerte.prediction_principale.score_risque)
        # fallback si pas join comme ça:
        if score_final is None:
            # si tu stockes le score dans prediction principale via idmod:
            score_final = 0.0

        recent_alerts.append({
            "idAlerte": str(a.idalerte),
            "date_creation": a.date_creation.isoformat(),
            "criticite": a.criticite,
            "statut": a.statut,
            "raison": a.raison,
            "score_final": float(score_final),
            "idTransac": str(a.idtransac) if a.idtransac else None,
        })

    return {
        "transactions_24h": int(transactions_24h),
        "alertes_actives": int(alertes_actives),
        "taux_fraude_7j": float(taux_fraude_7j),
        "temps_moyen_analyse_ms": int(temps_moyen_analyse_ms),
        "criticite_distribution_7j": criticite_distribution_7j,
        "recent_alerts": recent_alerts
    }