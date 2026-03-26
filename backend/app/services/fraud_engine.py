from dataclasses import dataclass
from typing import Dict, Optional

import pandas as pd

from app.core.settings import XGB_FRAUD_THRESHOLD, CRIT_LOW_MAX, CRIT_MED_MAX
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
    if score_final < CRIT_LOW_MAX:
        return "FAIBLE"
    if score_final < CRIT_MED_MAX:
        return "MOYEN"
    return "ELEVE"


def _prepare_feature_row(ml_features: Dict[str, float], feature_names: list[str]) -> pd.DataFrame:
    row = dict(ml_features)

    # Encodage segment
    segment = str(row.get("client_segment", "STANDARD")).upper()
    row["client_segment"] = 1 if segment == "PREMIUM" else 0

    # One-hot simple pour client_pays
    client_pays = str(row.get("client_pays", "France")).strip()
    row[f"client_pays_{client_pays}"] = 1
    row.pop("client_pays", None)

    # S'assurer que toutes les colonnes attendues existent
    for col in feature_names:
        if col not in row:
            row[col] = 0

    df = pd.DataFrame([row])

    # Ne garder que les colonnes attendues, dans le bon ordre
    df = df[feature_names]
    return df


def evaluate_transaction(
    montant: float,
    canal: str,
    pays: Optional[str],
    ml_features: Optional[Dict[str, float]] = None,
) -> FraudDecision:
    if not ml_features:
        res = score_transaction_mock(montant=montant, canal=canal, pays=pays)
        return FraudDecision(
            score_xgb=res.score_xgb,
            score_iforest=res.score_iforest,
            score_final=res.score_final,
            criticite=res.criticite,
            raison="Fallback mock (pas de ml_features)",
            modele_principal="XGBoost",
        )

    iso, xgb, scaler_iso, scaler_xgb, feature_names = load_models()

    df = _prepare_feature_row(ml_features, feature_names)

    # Prépa XGBoost
    df_xgb = df.copy()
    if "Amount" in df_xgb.columns:
        df_xgb["Amount_scaled"] = scaler_xgb.transform(df_xgb[["Amount"]])
        if "Amount" in df_xgb.columns:
            df_xgb = df_xgb.drop(columns=["Amount"])

    # Prépa Isolation Forest
    df_iso = df.copy()
    if "Amount" in df_iso.columns:
        df_iso["Amount_scaled"] = scaler_iso.transform(df_iso[["Amount"]])
        if "Amount" in df_iso.columns:
            df_iso = df_iso.drop(columns=["Amount"])

    score_xgb = float(xgb.predict_proba(df_xgb)[:, 1][0])

    pred_if = int(iso.predict(df_iso)[0])  # -1 anomalie, 1 normal
    score_iforest = 1.0 if pred_if == -1 else 0.0

    # Score final piloté par le modèle supervisé
    score_final = score_xgb
    criticite = _to_criticite(score_final)

    raison = (
        f"Scoring réel (XGBoost+IF) | "
        f"score_xgb={score_xgb:.4f} | "
        f"if_anomaly={int(score_iforest == 1.0)} | "
        f"seuil_fraude={XGB_FRAUD_THRESHOLD:.6f} | "
        f"seuils_criticite={CRIT_LOW_MAX:.4f}/{CRIT_MED_MAX:.4f}"
    )

    return FraudDecision(
        score_xgb=score_xgb,
        score_iforest=score_iforest,
        score_final=score_final,
        criticite=criticite,
        raison=raison,
        modele_principal="XGBoost",
    )