from fastapi import FastAPI

app = FastAPI(
    title="FraudShield API",
    version="1.0.0"
)

@app.get("/health")
def health():
    return {"status": "ok"}
from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app import models

app = FastAPI(
    title="FraudShield API",
    version="1.0.0"
)

# Dependency DB
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/roles/count")
def count_roles(db: Session = Depends(get_db)):
    count = db.query(models.Role).count()
    return {"roles_count": count}

@app.post("/setup/seed-roles")
def seed_roles(db: Session = Depends(get_db)):
    default_roles = ["ADMIN", "ANALYSTE", "RESP_RISQUE"]

    created = 0
    for r in default_roles:
        exists = db.query(models.Role).filter(models.Role.nom == r).first()
        if not exists:
            db.add(models.Role(nom=r))
            created += 1

    db.commit()
    return {"created": created}
