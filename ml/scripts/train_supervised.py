from pathlib import Path

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.metrics import classification_report, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from xgboost import XGBClassifier

BASE_DIR = Path(__file__).resolve().parents[2]
DATA_PATH = BASE_DIR / "data" / "processed" / "fraudshield_dataset_v1.csv"
MODELS_DIR = BASE_DIR / "ml" / "models"

RANDOM_SEED = 42


def main():
    print("Loading dataset...")
    df = pd.read_csv(DATA_PATH)

    y = df["Class"].astype(int)
    X = df.drop(columns=["Class"]).copy()

    numeric_features = [
        "Amount",
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
    ]

    categorical_features = [
        "client_segment",
        "client_pays",
    ]

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), numeric_features),
            ("cat", OneHotEncoder(handle_unknown="ignore"), categorical_features),
        ]
    )

    model = XGBClassifier(
        n_estimators=250,
        max_depth=5,
        learning_rate=0.05,
        subsample=0.9,
        colsample_bytree=0.9,
        objective="binary:logistic",
        eval_metric="logloss",
        random_state=RANDOM_SEED,
        n_jobs=4,
        scale_pos_weight=max((len(y) - y.sum()) / max(y.sum(), 1), 1.0),
    )

    pipeline = Pipeline([
        ("preprocessor", preprocessor),
        ("model", model),
    ])

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=RANDOM_SEED,
        stratify=y,
    )

    print("Training XGBoost...")
    pipeline.fit(X_train, y_train)

    y_proba = pipeline.predict_proba(X_test)[:, 1]
    y_pred = (y_proba >= 0.5).astype(int)

    auc = roc_auc_score(y_test, y_proba)
    print(f"ROC-AUC: {auc:.4f}")
    print("\nClassification report @0.5")
    print(classification_report(y_test, y_pred, digits=4))

    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    # Sauvegarde pipeline modèle complet
    joblib.dump(pipeline, MODELS_DIR / "xgboost_fraud.joblib")

    # Sauvegarde feature names transformées
    preprocessor_fitted = pipeline.named_steps["preprocessor"]
    feature_names = preprocessor_fitted.get_feature_names_out().tolist()
    joblib.dump(feature_names, MODELS_DIR / "feature_names.joblib")

    # Sauvegarde scaler dédié "Amount" pour compat backend actuel
    amount_scaler = StandardScaler()
    amount_scaler.fit(X_train[["Amount"]])
    joblib.dump(amount_scaler, MODELS_DIR / "scaler_amount_supervised.joblib")

    print("\nSaved:")
    print("-", MODELS_DIR / "xgboost_fraud.joblib")
    print("-", MODELS_DIR / "feature_names.joblib")
    print("-", MODELS_DIR / "scaler_amount_supervised.joblib")


if __name__ == "__main__":
    main()