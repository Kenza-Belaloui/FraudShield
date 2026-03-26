from datetime import date, timedelta
import csv
import io

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import desc, or_
from sqlalchemy.orm import Session

from app import models
from app.core.deps import get_current_user, get_db
from app.services.reason_labels import REASON_LABELS

router = APIRouter(prefix="/alerts", tags=["Alertes"])


def _reason_labels(reason_codes: list[str] | None):
    codes = reason_codes or []
    return [{"code": c, "label": REASON_LABELS.get(c, c)} for c in codes]


@router.get("")
def list_alerts(
    page: int = 1,
    page_size: int = 20,
    criticite: str | None = None,
    statut: str | None = None,
    date_debut: date | None = None,
    date_fin: date | None = None,
    montant_min: float | None = None,
    montant_max: float | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if page < 1:
        page = 1
    if page_size < 1:
        page_size = 20
    if page_size > 100:
        page_size = 100

    q = (
        db.query(models.Alerte)
        .join(models.Transaction, models.Alerte.idtransac == models.Transaction.idtransac)
        .join(models.Client, models.Transaction.idclient == models.Client.idclient)
        .join(models.Commercant, models.Transaction.idcommercant == models.Commercant.idcommercant)
        .order_by(desc(models.Alerte.date_creation))
    )

    if criticite:
        q = q.filter(models.Alerte.criticite == criticite)

    if statut:
        q = q.filter(models.Alerte.statut == statut)

    if date_debut:
        q = q.filter(models.Alerte.date_creation >= date_debut)

    if date_fin:
        q = q.filter(models.Alerte.date_creation < (date_fin + timedelta(days=1)))

    if montant_min is not None:
        q = q.filter(models.Transaction.montant >= montant_min)

    if montant_max is not None:
        q = q.filter(models.Transaction.montant <= montant_max)

    if search:
        s = search.strip()
        q = q.filter(
            or_(
                models.Client.nom.ilike(f"%{s}%"),
                models.Client.prenom.ilike(f"%{s}%"),
                models.Transaction.idtransac.cast(models.String).ilike(f"%{s}%"),
            )
        )

    total = q.count()
    rows = q.offset((page - 1) * page_size).limit(page_size).all()

    items = []
    for a in rows:
        t = a.transaction
        c = t.client
        m = t.commercant

        score_final = None
        if a.prediction_principale:
            score_final = float(a.prediction_principale.score_risque)

        raw_reason_codes = getattr(t, "reason_codes", None) or []

        items.append({
            "idAlerte": str(a.idalerte),
            "criticite": a.criticite,
            "statut": a.statut,
            "raison": a.raison,
            "date_creation": a.date_creation.isoformat(),
            "date_cloture": a.date_cloture.isoformat() if a.date_cloture else None,
            "score_final": score_final,
            "transaction": {
                "idTransac": str(t.idtransac),
                "date_heure": t.date_heure.isoformat(),
                "montant": float(t.montant),
                "devise": t.devise,
                "canal": t.canal,
                "statut": t.statut,
            },
            "client": {"nom": c.nom, "prenom": c.prenom},
            "commercant": {"nom": m.nom, "categorie": m.categorie},
            "reason_codes": raw_reason_codes,
            "reason_details": _reason_labels(raw_reason_codes),
        })

    return {"items": items, "page": page, "page_size": page_size, "total": total}


@router.get("/export.csv")
def export_alerts_csv(
    criticite: str | None = None,
    statut: str | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    q = (
        db.query(models.Alerte)
        .join(models.Transaction, models.Alerte.idtransac == models.Transaction.idtransac)
        .join(models.Client, models.Transaction.idclient == models.Client.idclient)
        .join(models.Commercant, models.Transaction.idcommercant == models.Commercant.idcommercant)
        .order_by(desc(models.Alerte.date_creation))
    )
    if criticite:
        q = q.filter(models.Alerte.criticite == criticite)
    if statut:
        q = q.filter(models.Alerte.statut == statut)

    rows = q.limit(5000).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "idAlerte",
        "date_creation",
        "date_cloture",
        "criticite",
        "statut",
        "score_final",
        "idTransac",
        "transaction_statut",
        "client",
        "commercant",
        "montant",
        "devise",
        "canal",
    ])

    for a in rows:
        t = a.transaction
        c = t.client
        m = t.commercant
        score_final = ""
        if a.prediction_principale:
            score_final = float(a.prediction_principale.score_risque)

        writer.writerow([
            str(a.idalerte),
            a.date_creation.isoformat(),
            a.date_cloture.isoformat() if a.date_cloture else "",
            a.criticite,
            a.statut,
            score_final,
            str(t.idtransac),
            t.statut,
            f"{c.nom} {c.prenom or ''}".strip(),
            m.nom,
            float(t.montant),
            t.devise,
            t.canal,
        ])

    output.seek(0)
    filename = "fraudshield_alerts_export.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )