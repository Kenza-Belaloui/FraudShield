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


def _prepare_supervised_row(ml_features: Dict[str, float]) -> pd.DataFrame:
    row = {
        "Amount": float(ml_features.get("Amount", 0.0)),
        "client_segment": ml_features.get("client_segment", "STANDARD"),
        "client_pays": ml_features.get("client_pays", "France"),
        "client_revenu_mensuel": float(ml_features.get("client_revenu_mensuel", 0.0)),
        "client_plafond_journalier": float(ml_features.get("client_plafond_journalier", 0.0)),
        "nb_tx_24h": int(ml_features.get("nb_tx_24h", 0)),
        "avg_amount_7d": float(ml_features.get("avg_amount_7d", 0.0)),
        "heure_nuit": int(ml_features.get("heure_nuit", 0)),
        "is_pays_inhabituel": int(ml_features.get("is_pays_inhabituel", 0)),
        "depasse_plafond": int(ml_features.get("depasse_plafond", 0)),
        "ratio_revenu": float(ml_features.get("ratio_revenu", 0.0)),
        "balance_error_orig": float(ml_features.get("balance_error_orig", 0.0)),
        "balance_error_dest": float(ml_features.get("balance_error_dest", 0.0)),
        "is_transfer": int(ml_features.get("is_transfer", 0)),
        "is_cash_out": int(ml_features.get("is_cash_out", 0)),
        "is_payment": int(ml_features.get("is_payment", 0)),
        "is_cash_in": int(ml_features.get("is_cash_in", 0)),
        "is_debit": int(ml_features.get("is_debit", 0)),
        "isFlaggedFraud": int(ml_features.get("isFlaggedFraud", 0)),
    }
    return pd.DataFrame([row])


def _prepare_iforest_row(ml_features: Dict[str, float]) -> pd.DataFrame:
    row = {
        "Amount": float(ml_features.get("Amount", 0.0)),
        "nb_tx_24h": int(ml_features.get("nb_tx_24h", 0)),
        "avg_amount_7d": float(ml_features.get("avg_amount_7d", 0.0)),
        "heure_nuit": int(ml_features.get("heure_nuit", 0)),
        "is_pays_inhabituel": int(ml_features.get("is_pays_inhabituel", 0)),
        "depasse_plafond": int(ml_features.get("depasse_plafond", 0)),
        "ratio_revenu": float(ml_features.get("ratio_revenu", 0.0)),
        "balance_error_orig": float(ml_features.get("balance_error_orig", 0.0)),
        "balance_error_dest": float(ml_features.get("balance_error_dest", 0.0)),
        "is_transfer": int(ml_features.get("is_transfer", 0)),
        "is_cash_out": int(ml_features.get("is_cash_out", 0)),
        "is_payment": int(ml_features.get("is_payment", 0)),
        "is_cash_in": int(ml_features.get("is_cash_in", 0)),
        "is_debit": int(ml_features.get("is_debit", 0)),
        "isFlaggedFraud": int(ml_features.get("isFlaggedFraud", 0)),
    }
    return pd.DataFrame([row])


def evaluate_transaction(
    montant: float,
    canal: str,
    pays: Optional[str],
    ml_features: Optional[Dict[str, float]] = None
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

    iso, xgb_pipeline, scaler_iso, _, _ = load_models()

    xgb_df = _prepare_supervised_row(ml_features)
    if_df = _prepare_iforest_row(ml_features)

    score_xgb = float(xgb_pipeline.predict_proba(xgb_df)[:, 1][0])

    if_scaled = scaler_iso.transform(if_df)
    pred_if = int(iso.predict(if_scaled)[0])  # -1 anomalie, 1 normal
    score_iforest = 1.0 if pred_if == -1 else 0.0

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