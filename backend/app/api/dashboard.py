from collections import Counter
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models
from app.core.deps import get_current_user, get_db
from app.services.reason_labels import REASON_LABELS

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary")
def dashboard_summary(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    now = datetime.now(timezone.utc)
    since_24h = now - timedelta(hours=24)
    since_7d = now - timedelta(days=7)

    transactions_24h = (
        db.query(func.count(models.Transaction.idtransac))
        .filter(models.Transaction.date_heure >= since_24h)
        .scalar()
    ) or 0

    transactions_7d = (
        db.query(func.count(models.Transaction.idtransac))
        .filter(models.Transaction.date_heure >= since_7d)
        .scalar()
    ) or 0

    alertes_actives = (
        db.query(func.count(models.Alerte.idalerte))
        .filter(models.Alerte.statut.in_(["OUVERTE", "EN_COURS"]))
        .scalar()
    ) or 0

    total_alerts_7d = (
        db.query(func.count(models.Alerte.idalerte))
        .filter(models.Alerte.date_creation >= since_7d)
        .scalar()
    ) or 0

    high_alerts_7d = (
        db.query(func.count(models.Alerte.idalerte))
        .filter(models.Alerte.date_creation >= since_7d)
        .filter(models.Alerte.criticite == "ELEVE")
        .scalar()
    ) or 0

    confirmed_fraud_7d = (
        db.query(func.count(models.Validation.idval))
        .join(models.Alerte, models.Validation.idalerte == models.Alerte.idalerte)
        .filter(models.Validation.date_creation >= since_7d)
        .filter(models.Validation.decision == "FRAUDE")
        .scalar()
    ) or 0

    confirmed_legit_7d = (
        db.query(func.count(models.Validation.idval))
        .join(models.Alerte, models.Validation.idalerte == models.Alerte.idalerte)
        .filter(models.Validation.date_creation >= since_7d)
        .filter(models.Validation.decision == "LEGITIME")
        .scalar()
    ) or 0

    taux_alerte_7j = (total_alerts_7d / transactions_7d * 100.0) if transactions_7d else 0.0
    taux_fraude_confirmee_7j = (confirmed_fraud_7d / transactions_7d * 100.0) if transactions_7d else 0.0
    taux_alertes_haute_criticite_7j = (high_alerts_7d / transactions_7d * 100.0) if transactions_7d else 0.0

    # Faux positifs = alertes clôturées comme légitimes
    total_reviewed_7d = confirmed_fraud_7d + confirmed_legit_7d
    taux_faux_positifs_7j = (confirmed_legit_7d / total_reviewed_7d * 100.0) if total_reviewed_7d else 0.0

    # Temps moyen d'analyse - valeur simulée pour MVP
    temps_moyen_analyse_ms = 120

    criticite_rows = (
        db.query(models.Alerte.criticite, func.count(models.Alerte.idalerte))
        .filter(models.Alerte.date_creation >= since_7d)
        .group_by(models.Alerte.criticite)
        .all()
    )

    criticite_distribution_7j = {"FAIBLE": 0, "MOYEN": 0, "ELEVE": 0}
    for c, n in criticite_rows:
        if c in criticite_distribution_7j:
            criticite_distribution_7j[c] = int(n)

    channel_rows = (
        db.query(models.Transaction.canal, func.count(models.Transaction.idtransac))
        .filter(models.Transaction.date_heure >= since_7d)
        .group_by(models.Transaction.canal)
        .all()
    )
    transactions_by_channel_7j = {canal: int(n) for canal, n in channel_rows}

    # Top reason codes sur 7j
    top_reason_counter = Counter()
    tx_with_reason = (
        db.query(models.Transaction.reason_codes)
        .filter(models.Transaction.date_heure >= since_7d)
        .filter(models.Transaction.reason_codes.isnot(None))
        .all()
    )

    for (codes,) in tx_with_reason:
        for code in (codes or []):
            top_reason_counter[code] += 1

    top_reason_codes = [
        {
            "code": code,
            "label": REASON_LABELS.get(code, code),
            "count": count,
        }
        for code, count in top_reason_counter.most_common(5)
    ]

    # Activité par commerçant
    merchant_rows = (
        db.query(models.Commercant.nom, func.count(models.Alerte.idalerte))
        .join(models.Transaction, models.Transaction.idcommercant == models.Commercant.idcommercant)
        .join(models.Alerte, models.Alerte.idtransac == models.Transaction.idtransac)
        .filter(models.Alerte.date_creation >= since_7d)
        .group_by(models.Commercant.nom)
        .order_by(func.count(models.Alerte.idalerte).desc())
        .limit(5)
        .all()
    )

    top_merchants_alerts = [
        {"nom": nom, "count": int(count)}
        for nom, count in merchant_rows
    ]

    recent = (
        db.query(models.Alerte)
        .order_by(models.Alerte.date_creation.desc())
        .limit(8)
        .all()
    )

    recent_alerts = []
    for a in recent:
        t = a.transaction
        c = t.client if t else None
        m = t.commercant if t else None

        score_final = None
        if a.prediction_principale:
            score_final = float(a.prediction_principale.score_risque)

        latest_validation = None
        if a.validations:
            last_v = sorted(a.validations, key=lambda x: x.date_creation or a.date_creation)[-1]
            latest_validation = {
                "decision": last_v.decision,
                "commentaire": last_v.commentaire,
                "date_creation": last_v.date_creation.isoformat() if last_v.date_creation else None,
                "utilisateur": last_v.utilisateur.nom_complet if last_v.utilisateur else None,
            }

        recent_alerts.append({
            "idAlerte": str(a.idalerte),
            "date_creation": a.date_creation.isoformat(),
            "criticite": a.criticite,
            "statut": a.statut,
            "raison": a.raison,
            "score_final": float(score_final or 0.0),
            "idTransac": str(a.idtransac) if a.idtransac else None,
            "client": f"{c.nom} {c.prenom or ''}".strip() if c else None,
            "commercant": m.nom if m else None,
            "latest_validation": latest_validation,
        })

    return {
        "transactions_24h": int(transactions_24h),
        "transactions_7d": int(transactions_7d),
        "alertes_actives": int(alertes_actives),
        "total_alerts_7d": int(total_alerts_7d),
        "high_alerts_7d": int(high_alerts_7d),
        "taux_alerte_7j": float(taux_alerte_7j),
        "taux_fraude_confirmee_7j": float(taux_fraude_confirmee_7j),
        "taux_alertes_haute_criticite_7j": float(taux_alertes_haute_criticite_7j),
        "taux_faux_positifs_7j": float(taux_faux_positifs_7j),
        "confirmed_fraud_7d": int(confirmed_fraud_7d),
        "confirmed_legit_7d": int(confirmed_legit_7d),
        "temps_moyen_analyse_ms": int(temps_moyen_analyse_ms),
        "criticite_distribution_7j": criticite_distribution_7j,
        "transactions_by_channel_7j": transactions_by_channel_7j,
        "top_reason_codes": top_reason_codes,
        "top_merchants_alerts": top_merchants_alerts,
        "recent_alerts": recent_alerts,
    }


@router.get("/timeseries")
def dashboard_timeseries(
    days: int = 7,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    days = max(3, min(days, 30))
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=days)

    day_tx = func.date_trunc("day", models.Transaction.date_heure)
    day_al = func.date_trunc("day", models.Alerte.date_creation)
    day_val = func.date_trunc("day", models.Validation.date_creation)

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
        db.query(day_val.label("day"), func.count(models.Validation.idval))
        .filter(models.Validation.date_creation >= since)
        .filter(models.Validation.decision == "FRAUDE")
        .group_by("day")
        .order_by("day")
        .all()
    )

    def to_map(rows):
        out = {}
        for d, n in rows:
            out[d.date().isoformat()] = int(n)
        return out

    tx_map = to_map(tx_rows)
    al_map = to_map(al_rows)
    fraud_map = to_map(fraud_rows)

    series = []
    for i in range(days):
        day = (since.date() + timedelta(days=i)).isoformat()
        tx = tx_map.get(day, 0)
        alerts = al_map.get(day, 0)
        confirmed_fraud = fraud_map.get(day, 0)
        fraud_rate = (confirmed_fraud / tx * 100.0) if tx else 0.0

        series.append({
            "date": day,
            "transactions": tx,
            "alertes": alerts,
            "fraude_confirmee": confirmed_fraud,
            "taux_fraude": round(float(fraud_rate), 3),
        })

    return {"days": days, "series": series}