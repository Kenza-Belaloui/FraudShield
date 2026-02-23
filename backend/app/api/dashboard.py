from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.core.deps import get_db, get_current_user
from app import models

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/kpis")
def dashboard_kpis(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    now = datetime.utcnow()
    start_24h = now - timedelta(hours=24)
    start_7d = now - timedelta(days=7)

    # 1) Transactions analysées (24h)
    tx_24h = db.query(func.count(models.Transaction.idtransac)).filter(
        models.Transaction.date_heure >= start_24h
    ).scalar() or 0

    # 2) Alertes actives
    alertes_actives = db.query(func.count(models.Alerte.idalerte)).filter(
        models.Alerte.statut == "OUVERTE"
    ).scalar() or 0

    # 3) Taux fraude estimé (7j) : proportion alertes ELEVE sur transactions
    tx_7d = db.query(func.count(models.Transaction.idtransac)).filter(
        models.Transaction.date_heure >= start_7d
    ).scalar() or 0

    alertes_eleve_7d = db.query(func.count(models.Alerte.idalerte)).filter(
        models.Alerte.date_creation >= start_7d,
        models.Alerte.criticite == "ELEVE"
    ).scalar() or 0

    taux_fraude = float(alertes_eleve_7d) / float(tx_7d) if tx_7d > 0 else 0.0

    # 4) Distribution criticité (7j)
    dist = db.query(models.Alerte.criticite, func.count(models.Alerte.idalerte)).filter(
        models.Alerte.date_creation >= start_7d
    ).group_by(models.Alerte.criticite).all()

    criticite_counts = {k: int(v) for k, v in dist}

    # 5) Alertes récentes (table)
    recent_alerts = db.query(models.Alerte).order_by(desc(models.Alerte.date_creation)).limit(10).all()

    recent_items = []
    for a in recent_alerts:
        # score_final via prediction principale si dispo
        score_final = None
        if getattr(a, "prediction_principale", None):
            score_final = float(a.prediction_principale.score_risque)

        recent_items.append({
            "idAlerte": str(a.idalerte),
            "date_creation": a.date_creation.isoformat() if a.date_creation else None,
            "criticite": a.criticite,
            "statut": a.statut,
            "raison": a.raison,
            "score_final": score_final,
            "idTransac": str(a.idtransac) if a.idtransac else None
        })

    # 6) temps moyen analyse (placeholder pro)
    # (dans une vraie prod on log la latence par transaction)
    temps_moyen_analyse_ms = 120  # valeur fixe temporaire

    return {
        "transactions_24h": int(tx_24h),
        "alertes_actives": int(alertes_actives),
        "taux_fraude_7j": round(taux_fraude, 4),
        "temps_moyen_analyse_ms": int(temps_moyen_analyse_ms),
        "criticite_distribution_7j": criticite_counts,
        "recent_alerts": recent_items
    }