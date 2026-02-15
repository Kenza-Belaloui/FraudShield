from dataclasses import dataclass
from typing import Optional, Dict
import pandas as pd

from app.ml.model_loader import load_models
from app.services.scoring import score_transaction_mock


@dataclass
class FraudDecision:
    score_xgb: float
    score_iforest: float
    score_final: float
    criticite: str
    raison: str
    modele_principal: str


def _to_criticite(score_final: float) -> str:
    if score_final < 0.4:
        return "FAIBLE"
    if score_final < 0.7:
        return "MOYEN"
    return "ELEVE"


def evaluate_transaction(
    montant: float,
    canal: str,
    pays: Optional[str],
    ml_features: Optional[Dict[str, float]] = None
) -> FraudDecision:
    # Si pas de features Kaggle => fallback (en attendant feature store comportemental)
    if not ml_features:
        res = score_transaction_mock(montant=montant, canal=canal, pays=pays)
        return FraudDecision(
            score_xgb=res.score_xgb,
            score_iforest=res.score_iforest,
            score_final=res.score_final,
            criticite=res.criticite,
            raison="Fallback mock (pas de ml_features)",
            modele_principal="XGBoost"
        )

    iso, xgb, scaler_iso, scaler_xgb = load_models()

    row = {"Time": float(ml_features.get("Time", 0.0))}
    for i in range(1, 29):
        row[f"V{i}"] = float(ml_features.get(f"V{i}", 0.0))
    row["Amount"] = float(montant)

    df = pd.DataFrame([row])

    df_iso = df.copy()
    df_iso["Amount_scaled"] = scaler_iso.transform(df_iso[["Amount"]])
    df_iso = df_iso.drop(columns=["Amount"])

    df_xgb = df.copy()
    df_xgb["Amount_scaled"] = scaler_xgb.transform(df_xgb[["Amount"]])
    df_xgb = df_xgb.drop(columns=["Amount"])

    score_xgb = float(xgb.predict_proba(df_xgb)[:, 1][0])

    pred_if = int(iso.predict(df_iso)[0])  # -1 anomalie, 1 normal
    score_iforest = 1.0 if pred_if == -1 else 0.0

    score_final = max(score_xgb, score_iforest)
    criticite = _to_criticite(score_final)

    return FraudDecision(
        score_xgb=score_xgb,
        score_iforest=score_iforest,
        score_final=score_final,
        criticite=criticite,
        raison="Scoring réel (XGBoost + IsolationForest)",
        modele_principal="XGBoost"
    )
