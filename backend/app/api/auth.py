from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from app.core.deps import get_db, get_current_user
from app import models
from app.core.security import verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["Auth"])


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


@router.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.Utilisateur).filter(models.Utilisateur.email == data.email).first()
    if not user or not verify_password(data.password, user.mot_de_passe_hash):
        raise HTTPException(status_code=401, detail="Identifiants invalides")
    if not user.actif:
        raise HTTPException(status_code=403, detail="Compte désactivé")

    token = create_access_token({"sub": str(user.iduser), "role": user.role.nom})

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role.nom,
        "user_id": str(user.iduser),
        "nom_complet": user.nom_complet,
        "email": user.email,
    }


@router.get("/me")
def me(current_user=Depends(get_current_user)):
    # Retour simple et utile pour ton UI
    full = (current_user.nom_complet or "").strip()
    parts = full.split(" ", 1)
    prenom = parts[0] if parts else ""
    nom = parts[1] if len(parts) > 1 else ""

    return {
        "nom": nom,
        "prenom": prenom,
        "email": current_user.email,
        "role": current_user.role.nom if current_user.role else None,
    }