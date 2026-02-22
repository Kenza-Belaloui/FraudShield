import pandas as pd
from pathlib import Path
import joblib
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score, precision_recall_curve, roc_curve, classification_report

BASE_DIR = Path(__file__).resolve().parents[1]
DATA_PATH = BASE_DIR / "data" / "processed" / "fraudshield_1000.csv"

MODEL_PATH = BASE_DIR / "ml" / "models" / "xgboost_fraud.joblib"
SCALER_PATH = BASE_DIR / "ml" / "models" / "scaler_supervised.joblib"
FEATURES_PATH = BASE_DIR / "ml" / "models" / "feature_names.joblib"

RANDOM_SEED = 42


def prepare_features(df: pd.DataFrame):
    df = df.copy()
    y = df["Class"].astype(int)

    # encode segment
    df["client_segment"] = df["client_segment"].map({"STANDARD": 0, "PREMIUM": 1}).fillna(0).astype(int)

    # one-hot pays
    df = pd.get_dummies(df, columns=["client_pays"], drop_first=True)

    X = df.drop(columns=["Class"])
    return X, y


def main():
    print("📥 Loading dataset...")
    df = pd.read_csv(DATA_PATH)

    print("📦 Loading model + scaler + feature schema...")
    model = joblib.load(MODEL_PATH)
    scaler = joblib.load(SCALER_PATH)
    feature_names = joblib.load(FEATURES_PATH)

    X, y = prepare_features(df)

    # align exact feature order (pro)
    for col in feature_names:
        if col not in X.columns:
            X[col] = 0
    X = X[feature_names]

    # scale same cols as training
    scale_cols = [c for c in ["Amount", "client_revenu_mensuel", "client_plafond_journalier", "avg_amount_7d"] if c in X.columns]
    X[scale_cols] = scaler.transform(X[scale_cols])

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_SEED, stratify=y
    )

    print("🔮 Predict proba...")
    y_proba = model.predict_proba(X_test)[:, 1]

    auc = roc_auc_score(y_test, y_proba)
    print(f"🎯 ROC-AUC: {auc:.4f}")

    precision, recall, thresholds = precision_recall_curve(y_test, y_proba)
    f1_scores = (2 * precision * recall) / (precision + recall + 1e-12)
    best_idx = f1_scores.argmax()
    best_threshold = thresholds[best_idx - 1]

    print("\n✅ Best threshold (max F1):", round(float(best_threshold), 6))
    print("Precision:", round(float(precision[best_idx]), 4))
    print("Recall:", round(float(recall[best_idx]), 4))
    print("F1:", round(float(f1_scores[best_idx]), 4))

    fpr, tpr, roc_thresholds = roc_curve(y_test, y_proba)
    idx = (abs(roc_thresholds - best_threshold)).argmin()
    print("\n📌 FPR:", round(float(fpr[idx]), 6))
    print("📌 TPR:", round(float(tpr[idx]), 6))

    y_pred = (y_proba >= best_threshold).astype(int)
    print("\n📄 Classification report:")
    print(classification_report(y_test, y_pred, digits=4))

    # Suggestion de seuils criticité (simple & pro)
    low = float(best_threshold) * 0.6
    high = float(best_threshold)

    print("\n🚦 Suggested criticity thresholds:")
    print("FAIBLE  : score < ", round(low, 4))
    print("MOYEN   : ", round(low, 4), "<= score < ", round(high, 4))
    print("ELEVE   : score >= ", round(high, 4))


if __name__ == "__main__":
    main()