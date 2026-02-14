import pandas as pd
from pathlib import Path
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import IsolationForest
import joblib
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score
from xgboost import XGBClassifier


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

def prepare_supervised(df: pd.DataFrame):
    X = df.drop(columns=["Class"]).copy()
    y = df["Class"].copy()

    scaler = StandardScaler()
    X["Amount_scaled"] = scaler.fit_transform(X[["Amount"]])
    X = X.drop(columns=["Amount"])

    return X, y, scaler


def train_xgboost(X_train, y_train):
    # gestion déséquilibre (pro)
    scale_pos_weight = (len(y_train) - y_train.sum()) / y_train.sum()

    model = XGBClassifier(
        n_estimators=300,
        max_depth=4,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        eval_metric="auc",
        scale_pos_weight=scale_pos_weight,
        random_state=42,
        n_jobs=-1
    )

    model.fit(X_train, y_train)
    return model



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
    print("\n🚀 Training XGBoost...")

    X_all, y_all, scaler_sup = prepare_supervised(df)

    X_train, X_test, y_train, y_test = train_test_split(
        X_all, y_all,
        test_size=0.2,
        stratify=y_all,
        random_state=42
    )

    xgb_model = train_xgboost(X_train, y_train)

    # évaluation pro
    y_pred_proba = xgb_model.predict_proba(X_test)[:, 1]
    auc = roc_auc_score(y_test, y_pred_proba)
    print(f"🎯 ROC-AUC: {auc:.4f}")

    # sauvegarde
    joblib.dump(xgb_model, MODELS_DIR / "xgboost_fraud.joblib")
    joblib.dump(scaler_sup, MODELS_DIR / "scaler_amount_supervised.joblib")

    print(f"💾 Saved: {MODELS_DIR / 'xgboost_fraud.joblib'}")
