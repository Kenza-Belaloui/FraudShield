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

    criticite_distribution_7j = {"FAIBLE": 0, "MOYEN": 0, "ELEVE": 0}
    for c, n in rows:
        if c in criticite_distribution_7j:
            criticite_distribution_7j[c] = int(n)

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

from sqlalchemy import func
from datetime import timedelta

@router.get("/timeseries")
def dashboard_timeseries(
    days: int = 7,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    days = max(3, min(days, 30))
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=days)

    # GROUP BY day (Postgres)
    day_tx = func.date_trunc("day", models.Transaction.date_heure)
    day_al = func.date_trunc("day", models.Alerte.date_creation)

    tx_rows = (
        db.query(day_tx.label("day"), func.count(models.Transaction.idtransac))
        .filter(models.Transaction.date_heure >= since)
        .group_by("day")
        .order_by("day")
        .all()
    )

    al_rows = (
        db.query(day_al.label("day"), func.count(models.Alerte.idalerte))
        .filter(models.Alerte.date_creation >= since)
        .group_by("day")
        .order_by("day")
        .all()
    )

    fraud_rows = (
        db.query(day_al.label("day"), func.count(models.Alerte.idalerte))
        .filter(models.Alerte.date_creation >= since)
        .filter(models.Alerte.criticite == "ELEVE")
        .group_by("day")
        .order_by("day")
        .all()
    )

    # Map -> day string
    def to_map(rows):
        out = {}
        for d, n in rows:
            out[d.date().isoformat()] = int(n)
        return out

    tx_map = to_map(tx_rows)
    al_map = to_map(al_rows)
    fraud_map = to_map(fraud_rows)

    # Build continuous series day-by-day
    series = []
    for i in range(days):
        day = (since.date() + timedelta(days=i)).isoformat()
        tx = tx_map.get(day, 0)
        alerts = al_map.get(day, 0)
        fraud = fraud_map.get(day, 0)
        fraud_rate = (fraud / tx * 100.0) if tx else 0.0

        series.append(
            {
                "date": day,
                "transactions": tx,
                "alertes": alerts,
                "fraude_eleve": fraud,
                "taux_fraude": round(float(fraud_rate), 3),
            }
        )

    return {"days": days, "series": series}