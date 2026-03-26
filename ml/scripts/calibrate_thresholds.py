from pathlib import Path

import joblib
import pandas as pd
from sklearn.metrics import classification_report, precision_recall_curve, roc_auc_score
from sklearn.model_selection import train_test_split

BASE_DIR = Path(__file__).resolve().parents[2]
DATA_PATH = BASE_DIR / "data" / "processed" / "fraudshield_dataset_v1.csv"
MODEL_PATH = BASE_DIR / "ml" / "models" / "xgboost_fraud.joblib"

RANDOM_SEED = 42


def main():
    print("Loading dataset...")
    df = pd.read_csv(DATA_PATH)

    X = df.drop(columns=["Class"]).copy()
    y = df["Class"].astype(int)

    _, X_test, _, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=RANDOM_SEED,
        stratify=y,
    )

    pipeline = joblib.load(MODEL_PATH)

    y_proba = pipeline.predict_proba(X_test)[:, 1]
    auc = roc_auc_score(y_test, y_proba)
    print(f"ROC-AUC: {auc:.4f}")

    precision, recall, thresholds = precision_recall_curve(y_test, y_proba)
    f1_scores = (2 * precision[:-1] * recall[:-1]) / (precision[:-1] + recall[:-1] + 1e-12)
    best_idx = f1_scores.argmax()
    best_threshold = float(thresholds[best_idx])

    print("\nBest threshold by F1:")
    print("threshold =", round(best_threshold, 6))
    print("precision =", round(float(precision[best_idx]), 4))
    print("recall    =", round(float(recall[best_idx]), 4))
    print("f1        =", round(float(f1_scores[best_idx]), 4))

    y_pred = (y_proba >= best_threshold).astype(int)
    print("\nClassification report @best threshold")
    print(classification_report(y_test, y_pred, digits=4))

    crit_low = round(best_threshold * 0.60, 6)
    crit_med = round(best_threshold, 6)

    print("\nSuggested .env values:")
    print(f'XGB_FRAUD_THRESHOLD="{best_threshold:.6f}"')
    print(f'CRIT_LOW_MAX="{crit_low:.6f}"')
    print(f'CRIT_MED_MAX="{crit_med:.6f}"')


if __name__ == "__main__":
    main()