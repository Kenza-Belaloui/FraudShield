import os

XGB_FRAUD_THRESHOLD = float(os.getenv("XGB_FRAUD_THRESHOLD", "0.167155"))
CRIT_LOW_MAX = float(os.getenv("CRIT_LOW_MAX", "0.1003"))
CRIT_MED_MAX = float(os.getenv("CRIT_MED_MAX", "0.1672"))