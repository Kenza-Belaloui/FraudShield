import pandas as pd
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import roc_auc_score
from sklearn.ensemble import IsolationForest
import joblib

# XGBoost
from xgboost import XGBClassifier


BASE_DIR = Path(__file__).resolve().parents[1]
DATA_PATH = BASE_DIR / "data" / "processed" / "fraudshield_1000.csv"

MODELS_DIR = BASE_DIR / "ml" / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

RANDOM_SEED = 42


# =========================
# 1) LOAD + CHECK
# =========================
def load_data() -> pd.DataFrame:
    print("📥 Loading dataset...")
    df = pd.read_csv(DATA_PATH)
    print("✅ Dataset loaded")
    return df


def explore(df: pd.DataFrame):
    print("\n🔍 Shape:", df.shape)
    print("\n🔍 Columns:", list(df.columns))
    print("\n🔍 Class distribution:")
    print(df["Class"].value_counts())


# =========================
# 2) FEATURE SELECTION
# =========================
# Kaggle: Time, V1..V28, Amount
# Ajoutés: client_id, client_segment, client_pays, client_revenu_mensuel,
#          client_plafond_journalier, nb_tx_24h, avg_amount_7d, heure_nuit,
#          is_pays_inhabituel, depasse_plafond
#
# 👉 On choisit un set "pro" :
# - tout Kaggle (sauf Class)
# - + features comportementales
# - + variables clients numériques
# - encoding simple pour segment/pays

def prepare_features(df: pd.DataFrame):
    df = df.copy()

    # 1) Target
    y = df["Class"].astype(int)

    # 2) Encode segment
    df["client_segment"] = df["client_segment"].map({"STANDARD": 0, "PREMIUM": 1}).fillna(0).astype(int)

    # 3) Encode pays (one-hot)
    df = pd.get_dummies(df, columns=["client_pays"], drop_first=True)

    # 4) Features X (tout sauf Class)
    X = df.drop(columns=["Class"])

    # 5) Standardisation de Amount + revenus (pro)
    scaler = StandardScaler()
    scale_cols = [c for c in ["Amount", "client_revenu_mensuel", "client_plafond_journalier", "avg_amount_7d"] if c in X.columns]
    X[scale_cols] = scaler.fit_transform(X[scale_cols])

    return X, y, scaler


# =========================
# 3) TRAIN ISOLATION FOREST
# =========================
def train_isolation_forest(X_normal: pd.DataFrame):
    print("\n🚀 Training IsolationForest...")
    iso = IsolationForest(
        n_estimators=300,
        contamination=0.40,  # cohérent car dataset est ~40% fraude (400/1000)
        random_state=RANDOM_SEED,
        n_jobs=-1
    )
    iso.fit(X_normal)
    print("✅ IsolationForest trained")
    return iso


# =========================
# 4) TRAIN XGBOOST
# =========================
def train_xgboost(X_train, y_train, X_test, y_test):
    print("\n🚀 Training XGBoost...")

    model = XGBClassifier(
        n_estimators=300,
        max_depth=5,
        learning_rate=0.05,
        subsample=0.9,
        colsample_bytree=0.9,
        random_state=RANDOM_SEED,
        eval_metric="logloss"
    )

    model.fit(X_train, y_train)

    y_proba = model.predict_proba(X_test)[:, 1]
    auc = roc_auc_score(y_test, y_proba)

    print(f"🎯 ROC-AUC: {auc:.4f}")
    return model


# =========================
# MAIN
# =========================
if __name__ == "__main__":
    df = load_data()
    explore(df)

    # X,y + scaler
    X, y, scaler = prepare_features(df)

    # Split stratifié (pro)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_SEED, stratify=y
    )

    # 1) IsolationForest sur normales uniquement
    X_train_normal = X_train[y_train == 0]
    iso = train_isolation_forest(X_train_normal)

    # 2) XGBoost supervisé
    xgb = train_xgboost(X_train, y_train, X_test, y_test)

    # =========================
    # SAVE
    # =========================
    joblib.dump(iso, MODELS_DIR / "isolation_forest.joblib")
    joblib.dump(xgb, MODELS_DIR / "xgboost_fraud.joblib")
    joblib.dump(scaler, MODELS_DIR / "scaler_supervised.joblib")

    # Sauvegarde du schéma des features (très pro)
    joblib.dump(list(X.columns), MODELS_DIR / "feature_names.joblib")

    print("\n💾 Saved models to:", MODELS_DIR)
    print("✅ Done")