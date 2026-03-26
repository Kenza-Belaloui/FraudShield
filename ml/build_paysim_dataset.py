import pandas as pd
import numpy as np
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
RAW_PATH = BASE_DIR / "data" / "raw" / "paysim.csv"
OUT_DIR = BASE_DIR / "data" / "processed"
OUT_PATH = OUT_DIR / "fraudshield_paysim_1000.csv"

RANDOM_SEED = 42
TOTAL_FRAUD = 600
TOTAL_NORMAL = 1400


def clean_dataset(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    cols = [
        "step",
        "type",
        "amount",
        "oldbalanceOrg",
        "newbalanceOrig",
        "oldbalanceDest",
        "newbalanceDest",
        "isFraud",
        "isFlaggedFraud",
    ]
    df = df[cols]

    df = df.dropna()
    df = df.drop_duplicates()

    numeric_cols = [
        "step",
        "amount",
        "oldbalanceOrg",
        "newbalanceOrig",
        "oldbalanceDest",
        "newbalanceDest",
        "isFraud",
        "isFlaggedFraud",
    ]
    for col in numeric_cols:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    df = df.dropna().reset_index(drop=True)

    df["isFraud"] = df["isFraud"].astype(int)
    df["isFlaggedFraud"] = df["isFlaggedFraud"].astype(int)

    return df


def add_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    # Features dérivées métier
    df["delta_orig"] = df["oldbalanceOrg"] - df["newbalanceOrig"]
    df["delta_dest"] = df["newbalanceDest"] - df["oldbalanceDest"]

    df["is_transfer"] = (df["type"] == "TRANSFER").astype(int)
    df["is_cash_out"] = (df["type"] == "CASH_OUT").astype(int)
    df["is_payment"] = (df["type"] == "PAYMENT").astype(int)
    df["is_cash_in"] = (df["type"] == "CASH_IN").astype(int)
    df["is_debit"] = (df["type"] == "DEBIT").astype(int)

    # Heure simulée
    df["hour_of_day"] = df["step"] % 24
    df["heure_nuit"] = df["hour_of_day"].isin([0, 1, 2, 3, 4, 5]).astype(int)

    # Signaux métier
    df["is_amount_high"] = (df["amount"] >= 1000).astype(int)
    df["orig_empty_after_tx"] = (df["newbalanceOrig"] <= 0).astype(int)

    # Incohérences
    df["balance_error_orig"] = np.abs(df["delta_orig"] - df["amount"])
    df["balance_error_dest"] = np.abs(df["delta_dest"] - df["amount"])

    return df


def sample_dataset(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    fraud_df = df[df["isFraud"] == 1]
    normal_df = df[df["isFraud"] == 0]

    if len(fraud_df) < TOTAL_FRAUD:
        raise ValueError(
            f"Pas assez de fraudes pour échantillonner {TOTAL_FRAUD}. Disponibles: {len(fraud_df)}"
        )

    if len(normal_df) < TOTAL_NORMAL:
        raise ValueError(
            f"Pas assez de non-fraudes pour échantillonner {TOTAL_NORMAL}. Disponibles: {len(normal_df)}"
        )

    fraud_sample = fraud_df.sample(n=TOTAL_FRAUD, random_state=RANDOM_SEED)
    normal_sample = normal_df.sample(n=TOTAL_NORMAL, random_state=RANDOM_SEED)

    final_df = pd.concat([fraud_sample, normal_sample], axis=0)

    # mélange
    final_df = final_df.sample(frac=1, random_state=RANDOM_SEED).reset_index(drop=True)

    print(f"Frauds sampled: {TOTAL_FRAUD}")
    print(f"Normals sampled: {TOTAL_NORMAL}")
    print(f"Final total: {len(final_df)}")

    return final_df


def main():
    print(f"Loading raw dataset: {RAW_PATH}")
    df = pd.read_csv(RAW_PATH)

    print("Raw shape:", df.shape)
    print("Raw fraud distribution:")
    print(df["isFraud"].value_counts(dropna=False))

    df = clean_dataset(df)
    print("\nAfter cleaning:", df.shape)

    df = add_features(df)
    print("After feature engineering:", df.shape)

    df = sample_dataset(df)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    df.to_csv(OUT_PATH, index=False)

    print(f"\nSaved processed dataset to: {OUT_PATH}")
    print("Final shape:", df.shape)
    print("Final fraud distribution:")
    print(df["isFraud"].value_counts())
    print("\nFlagged fraud distribution:")
    print(df["isFlaggedFraud"].value_counts())


if __name__ == "__main__":
    main()