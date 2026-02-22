import pandas as pd
import numpy as np
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
RAW_PATH = BASE_DIR / "data" / "raw" / "creditcard.csv"
OUT_DIR = BASE_DIR / "data" / "processed"
OUT_PATH = OUT_DIR / "fraudshield_1000.csv"

RANDOM_SEED = 42


def add_client_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Ajoute des colonnes "banque" réalistes :
    - Segment, pays, revenu, plafond
    - Features comportementales simulées (pour PFE)
    """
    rng = np.random.default_rng(RANDOM_SEED)
    n = len(df)

    # ------------- Client "profil" -------------
    df["client_id"] = rng.integers(1, 201, size=n)  # 200 clients simulés
    df["client_segment"] = rng.choice(["STANDARD", "PREMIUM"], size=n, p=[0.8, 0.2])

    df["client_pays"] = rng.choice(
        ["FR", "ES", "DE", "IT", "BE", "MA", "TN"],
        size=n,
        p=[0.55, 0.08, 0.08, 0.08, 0.07, 0.07, 0.07]
    )

    # Revenu mensuel selon segment
    revenu_standard = rng.normal(loc=2500, scale=800, size=n).clip(800, 8000)
    revenu_premium = rng.normal(loc=6000, scale=1800, size=n).clip(2000, 20000)
    df["client_revenu_mensuel"] = np.where(df["client_segment"] == "PREMIUM", revenu_premium, revenu_standard).round(2)

    # Plafond journalier corrélé au revenu
    df["client_plafond_journalier"] = (df["client_revenu_mensuel"] * rng.uniform(0.15, 0.35, size=n)).clip(200, 8000).round(2)

    # ------------- Features comportementales simulées -------------
    # (dans une version "entreprise", elles viennent de la DB via le feature_store)
    df["nb_tx_24h"] = rng.poisson(lam=3, size=n).clip(0, 30)
    df["avg_amount_7d"] = rng.normal(loc=60, scale=40, size=n).clip(1, 500).round(2)

    # Heures de nuit (basé sur Time Kaggle en secondes)
    # Time est le nb de secondes depuis la 1ère transaction du dataset
    # On simule l'heure dans une journée avec modulo 24h.
    hour = ((df["Time"] % (24 * 3600)) / 3600.0)
    df["heure_nuit"] = ((hour >= 0) & (hour <= 6)).astype(int)

    # Pays inhabituel (simulé) : plus probable si fraude
    # (pour créer un signal réaliste dans ton PFE)
    base_prob = 0.05
    fraud_boost = 0.35
    prob = np.where(df["Class"] == 1, base_prob + fraud_boost, base_prob)
    df["is_pays_inhabituel"] = (rng.random(n) < prob).astype(int)

    # Dépasse plafond : si Amount > plafond_journalier (signal logique)
    df["depasse_plafond"] = (df["Amount"] > df["client_plafond_journalier"]).astype(int)

    return df


def main():
    print("📥 Loading raw dataset:", RAW_PATH)
    df = pd.read_csv(RAW_PATH)

    print("🔎 Sampling 600 normal (Class=0) + 400 fraud (Class=1)")
    df0 = df[df["Class"] == 0].sample(600, random_state=RANDOM_SEED)
    df1 = df[df["Class"] == 1].sample(400, random_state=RANDOM_SEED)

    small = pd.concat([df0, df1], axis=0).sample(frac=1, random_state=RANDOM_SEED).reset_index(drop=True)

    print("✨ Adding client & behavior features...")
    small = add_client_features(small)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    small.to_csv(OUT_PATH, index=False)

    print("✅ Saved:", OUT_PATH)
    print("📊 New shape:", small.shape)
    print("📌 Class distribution:\n", small["Class"].value_counts())


if __name__ == "__main__":
    main()