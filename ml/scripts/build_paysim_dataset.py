import numpy as np
import pandas as pd
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[2]
RAW_PATH = BASE_DIR / "data" / "raw" / "paysim.csv"
OUT_DIR = BASE_DIR / "data" / "processed"
OUT_PATH = OUT_DIR / "fraudshield_dataset_v1.csv"

RANDOM_SEED = 42
SAMPLE_SIZE = 50000  # tu peux descendre à 20000 si ton PC est lent


def load_and_clean() -> pd.DataFrame:
    df = pd.read_csv(RAW_PATH)

    required_cols = [
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
    df = df[required_cols].dropna().drop_duplicates().copy()

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


def enrich_business_features(df: pd.DataFrame) -> pd.DataFrame:
    rng = np.random.default_rng(RANDOM_SEED)
    df = df.copy()

    # Colonnes alignées avec ton backend
    df["Amount"] = df["amount"].astype(float)

    # segment client simulé
    df["client_segment"] = rng.choice(
        ["STANDARD", "PREMIUM"],
        size=len(df),
        p=[0.8, 0.2]
    )

    # pays client simulé
    countries = ["France", "Belgium", "Spain", "Italy", "Germany"]
    df["client_pays"] = rng.choice(
        countries,
        size=len(df),
        p=[0.65, 0.08, 0.09, 0.09, 0.09]
    )

    # revenu mensuel selon segment
    df["client_revenu_mensuel"] = np.where(
        df["client_segment"] == "PREMIUM",
        rng.normal(6500, 1200, len(df)),
        rng.normal(2500, 700, len(df)),
    )
    df["client_revenu_mensuel"] = np.clip(df["client_revenu_mensuel"], 900, None)

    # plafond journalier selon segment
    df["client_plafond_journalier"] = np.where(
        df["client_segment"] == "PREMIUM",
        rng.normal(5000, 1000, len(df)),
        rng.normal(1600, 400, len(df)),
    )
    df["client_plafond_journalier"] = np.clip(df["client_plafond_journalier"], 300, None)

    # features comportementales/transactionnelles
    df["nb_tx_24h"] = rng.poisson(3, len(df))
    df["avg_amount_7d"] = np.maximum(
        5,
        df["Amount"] * rng.uniform(0.35, 0.95, len(df))
    )

    df["hour_of_day"] = df["step"] % 24
    df["heure_nuit"] = df["hour_of_day"].isin([0, 1, 2, 3, 4, 5]).astype(int)

    # incohérences de balance
    df["delta_orig"] = df["oldbalanceOrg"] - df["newbalanceOrig"]
    df["delta_dest"] = df["newbalanceDest"] - df["oldbalanceDest"]

    df["balance_error_orig"] = np.abs(df["delta_orig"] - df["amount"])
    df["balance_error_dest"] = np.abs(df["delta_dest"] - df["amount"])

    # mapping métier simple
    df["is_transfer"] = (df["type"] == "TRANSFER").astype(int)
    df["is_cash_out"] = (df["type"] == "CASH_OUT").astype(int)
    df["is_payment"] = (df["type"] == "PAYMENT").astype(int)
    df["is_cash_in"] = (df["type"] == "CASH_IN").astype(int)
    df["is_debit"] = (df["type"] == "DEBIT").astype(int)

    df["depasse_plafond"] = (df["Amount"] > df["client_plafond_journalier"]).astype(int)
    df["ratio_revenu"] = df["Amount"] / df["client_revenu_mensuel"]
    df["is_pays_inhabituel"] = rng.binomial(1, 0.07, len(df))

    # renforcement léger des patterns fraude pour cohérence métier
    fraud_mask = df["isFraud"] == 1
    df.loc[fraud_mask, "nb_tx_24h"] = df.loc[fraud_mask, "nb_tx_24h"] + rng.integers(3, 10, fraud_mask.sum())
    df.loc[fraud_mask, "is_pays_inhabituel"] = rng.binomial(1, 0.45, fraud_mask.sum())
    df.loc[fraud_mask, "depasse_plafond"] = np.maximum(
        df.loc[fraud_mask, "depasse_plafond"],
        rng.binomial(1, 0.55, fraud_mask.sum())
    )
    df.loc[fraud_mask, "heure_nuit"] = np.maximum(
        df.loc[fraud_mask, "heure_nuit"],
        rng.binomial(1, 0.35, fraud_mask.sum())
    )

    df["Class"] = df["isFraud"].astype(int)

    final_cols = [
        "Amount",
        "client_segment",
        "client_pays",
        "client_revenu_mensuel",
        "client_plafond_journalier",
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
        "Class",
    ]

    return df[final_cols].copy()


def sample_if_needed(df: pd.DataFrame) -> pd.DataFrame:
    if len(df) <= SAMPLE_SIZE:
        return df.sample(frac=1, random_state=RANDOM_SEED).reset_index(drop=True)

    fraud_df = df[df["Class"] == 1]
    legit_df = df[df["Class"] == 0]

    fraud_ratio = len(fraud_df) / len(df)
    fraud_target = max(int(SAMPLE_SIZE * max(fraud_ratio, 0.08)), min(len(fraud_df), 3000))
    legit_target = SAMPLE_SIZE - fraud_target

    fraud_sample = fraud_df.sample(
        n=min(fraud_target, len(fraud_df)),
        random_state=RANDOM_SEED
    )
    legit_sample = legit_df.sample(
        n=min(legit_target, len(legit_df)),
        random_state=RANDOM_SEED
    )

    out = pd.concat([fraud_sample, legit_sample], axis=0)
    out = out.sample(frac=1, random_state=RANDOM_SEED).reset_index(drop=True)
    return out


def main():
    print(f"Loading raw dataset: {RAW_PATH}")
    df = load_and_clean()
    print("Raw cleaned shape:", df.shape)
    print("Raw fraud distribution:")
    print(df["isFraud"].value_counts(normalize=True))

    df = enrich_business_features(df)
    print("\nAfter enrichment:", df.shape)
    print("Class distribution before sample:")
    print(df["Class"].value_counts())

    df = sample_if_needed(df)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    df.to_csv(OUT_PATH, index=False)

    print(f"\nSaved processed dataset to: {OUT_PATH}")
    print("Final shape:", df.shape)
    print("Final class distribution:")
    print(df["Class"].value_counts())
    print("\nColumns:")
    print(list(df.columns))


if __name__ == "__main__":
    main()