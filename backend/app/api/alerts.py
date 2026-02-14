from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_, and_
from datetime import date

from app.core.deps import get_db, get_current_user
from app import models

router = APIRouter(prefix="/alerts", tags=["Alertes"])


@router.get("")
def list_alerts(
    page: int = 1,
    page_size: int = 20,

    criticite: str | None = None,     # FAIBLE|MOYEN|ELEVE
    statut: str | None = None,        # OUVERTE|EN_COURS|CLOTUREE

    date_debut: date | None = None,
    date_fin: date | None = None,

    montant_min: float | None = None,
    montant_max: float | None = None,

    search: str | None = None,        # nom client ou idTransac
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

    # Filtres
    if criticite:
        q = q.filter(models.Alerte.criticite == criticite)

    if statut:
        q = q.filter(models.Alerte.statut == statut)

    if date_debut:
        q = q.filter(models.Alerte.date_creation >= date_debut)

    if date_fin:
        # inclure la journée entière
        q = q.filter(models.Alerte.date_creation < date_fin)

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

        items.append({
            "idAlerte": str(a.idalerte),
            "criticite": a.criticite,
            "statut": a.statut,
            "raison": a.raison,
            "date_creation": a.date_creation.isoformat(),
            "score_final": score_final,
            "transaction": {
                "idTransac": str(t.idtransac),
                "date_heure": t.date_heure.isoformat(),
                "montant": float(t.montant),
                "devise": t.devise,
                "canal": t.canal
            },
            "client": {"nom": c.nom, "prenom": c.prenom},
            "commercant": {"nom": m.nom, "categorie": m.categorie}
        })

    return {"items": items, "page": page, "page_size": page_size, "total": total}
