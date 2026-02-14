import pandas as pd
from pathlib import Path
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import IsolationForest
import joblib

BASE_DIR = Path(__file__).resolve().parents[1]
DATA_PATH = BASE_DIR / "data" / "raw" / "creditcard.csv"


def load_data():
    print("📥 Loading dataset...")
    df = pd.read_csv(DATA_PATH)
    print("✅ Dataset loaded")
    return df


def explore(df: pd.DataFrame):
    print("\n🔍 Shape:", df.shape)
    print("\n🔍 Columns:", list(df.columns))
    print("\n🔍 Class distribution:")
    print(df["Class"].value_counts(normalize=True))


def prepare_features(df: pd.DataFrame):
    X = df.drop(columns=["Class"]).copy()

    scaler = StandardScaler()
    X["Amount_scaled"] = scaler.fit_transform(X[["Amount"]])
    X = X.drop(columns=["Amount"])

    return X, scaler


def train_isolation_forest(X: pd.DataFrame):
    iso = IsolationForest(
        n_estimators=200,
        contamination=0.0017,
        random_state=42,
        n_jobs=-1
    )
    iso.fit(X)
    return iso


if __name__ == "__main__":
    df = load_data()
    explore(df)

    df_normal = df[df["Class"] == 0].sample(50000, random_state=42)

    X_normal, scaler = prepare_features(df_normal)

    print("\n🚀 Training IsolationForest...")
    iso = train_isolation_forest(X_normal)
    print("✅ IsolationForest trained")

    MODELS_DIR = BASE_DIR / "ml" / "models"
    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    joblib.dump(iso, MODELS_DIR / "isolation_forest.joblib")
    joblib.dump(scaler, MODELS_DIR / "scaler_amount.joblib")

    print(f"💾 Saved: {MODELS_DIR / 'isolation_forest.joblib'}")
