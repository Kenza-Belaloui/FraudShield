from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.db import SessionLocal
from app import models
from app.core.security import verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["Auth"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.Utilisateur).filter(models.Utilisateur.email == data.email).first()
    if not user or not verify_password(data.password, user.mot_de_passe_hash):
        raise HTTPException(status_code=401, detail="Identifiants invalides")

    token = create_access_token({"sub": str(user.iduser), "role": user.role.nom})
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role.nom,
        "user_id": str(user.iduser),
        "nom_complet": user.nom_complet
    }
