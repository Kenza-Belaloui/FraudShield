from functools import lru_cache
from pathlib import Path
import joblib

@lru_cache(maxsize=1)
def load_models():
    base_dir = Path(__file__).resolve().parents[3]  # .../FraudShield
    models_dir = base_dir / "ml" / "models"

    iso = joblib.load(models_dir / "isolation_forest.joblib")
    xgb = joblib.load(models_dir / "xgboost_fraud.joblib")
    scaler_iso = joblib.load(models_dir / "scaler_amount.joblib")
    scaler_xgb = joblib.load(models_dir / "scaler_amount_supervised.joblib")

    return iso, xgb, scaler_iso, scaler_xgb
