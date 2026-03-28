from datetime import date, timedelta
import csv
import io

from fastapi import APIRouter, Depends, HTTPException
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

        latest_validation = None
        if a.validations:
            last_v = sorted(a.validations, key=lambda x: x.date_creation or a.date_creation)[-1]
            latest_validation = {
                "idValidation": str(last_v.idval),
                "decision": last_v.decision,
                "commentaire": last_v.commentaire,
                "date_creation": last_v.date_creation.isoformat() if last_v.date_creation else None,
                "utilisateur": {
                    "idUser": str(last_v.utilisateur.iduser) if last_v.utilisateur else None,
                    "nom_complet": last_v.utilisateur.nom_complet if last_v.utilisateur else None,
                    "email": last_v.utilisateur.email if last_v.utilisateur else None,
                },
            }

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
            "latest_validation": latest_validation,
        })

    return {"items": items, "page": page, "page_size": page_size, "total": total}


@router.get("/{idalerte}")
def get_alert_detail(
    idalerte: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    a = db.query(models.Alerte).filter(models.Alerte.idalerte == idalerte).first()
    if not a:
        raise HTTPException(status_code=404, detail="Alerte introuvable")

    t = a.transaction
    c = t.client if t else None
    m = t.commercant if t else None

    score_final = None
    if a.prediction_principale:
        score_final = float(a.prediction_principale.score_risque)

    validations = []
    for v in sorted(a.validations, key=lambda x: x.date_creation or a.date_creation):
        validations.append({
            "idValidation": str(v.idval),
            "decision": v.decision,
            "commentaire": v.commentaire,
            "date_creation": v.date_creation.isoformat() if v.date_creation else None,
            "utilisateur": {
                "idUser": str(v.utilisateur.iduser) if v.utilisateur else None,
                "nom_complet": v.utilisateur.nom_complet if v.utilisateur else None,
                "email": v.utilisateur.email if v.utilisateur else None,
            },
        })

    raw_reason_codes = getattr(t, "reason_codes", None) or []

    return {
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
        } if t else None,
        "client": {
            "nom": c.nom,
            "prenom": c.prenom,
        } if c else None,
        "commercant": {
            "nom": m.nom,
            "categorie": m.categorie,
            "pays": m.pays,
            "ville": m.ville,
        } if m else None,
        "features": getattr(t, "features", None) if t else None,
        "reason_codes": raw_reason_codes,
        "reason_details": _reason_labels(raw_reason_codes),
        "validations": validations,
    }


@router.post("/{idalerte}/take")
def take_alert(
    idalerte: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    a = db.query(models.Alerte).filter(models.Alerte.idalerte == idalerte).first()
    if not a:
        raise HTTPException(status_code=404, detail="Alerte introuvable")

    if a.statut == "CLOTUREE":
        raise HTTPException(status_code=400, detail="Alerte déjà clôturée")

    a.statut = "EN_COURS"
    db.add(a)
    db.commit()
    db.refresh(a)

    return {
        "idAlerte": str(a.idalerte),
        "statut": a.statut,
        "message": f"Alerte prise en charge par {current_user.nom_complet}",
    }


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