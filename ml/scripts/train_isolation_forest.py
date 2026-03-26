from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

BASE_DIR = Path(__file__).resolve().parents[2]
DATA_PATH = BASE_DIR / "data" / "processed" / "fraudshield_dataset_v1.csv"
MODELS_DIR = BASE_DIR / "ml" / "models"

RANDOM_SEED = 42


def main():
    print("Loading dataset...")
    df = pd.read_csv(DATA_PATH)

    # On entraîne IF surtout sur les transactions légitimes
    normal_df = df[df["Class"] == 0].copy()

    features = [
        "Amount",
        "nb_tx_24h",
        "avg_amount_7d",
        "heure_nuit",
        "is_pays_inhabituel",
        "depasse_plafond",
        "ratio_revenu",
        "balance_error_orig",
        "balance_error_dest",
        "is_transfer",
        "is_cash_out",
        "is_payment",
        "is_cash_in",
        "is_debit",
        "isFlaggedFraud",
    ]

    X = normal_df[features].copy()

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    model = IsolationForest(
        n_estimators=200,
        contamination=0.03,
        random_state=RANDOM_SEED,
        n_jobs=4,
    )
    print("Training Isolation Forest...")
    model.fit(X_scaled)

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, MODELS_DIR / "isolation_forest.joblib")
    joblib.dump(scaler, MODELS_DIR / "scaler_amount.joblib")

    print("\nSaved:")
    print("-", MODELS_DIR / "isolation_forest.joblib")
    print("-", MODELS_DIR / "scaler_amount.joblib")


if __name__ == "__main__":
    main()