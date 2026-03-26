from typing import Dict

REASON_LABELS: Dict[str, str] = {
    "ANOMALIE_IFOREST": "Anomalie détectée par le modèle non supervisé",
    "DEPASSE_PLAFOND_JOURNALIER": "Dépassement du plafond journalier",
    "PAYS_INHABITUEL": "Transaction depuis un pays inhabituel",
    "HEURE_NOCTURNE": "Transaction effectuée à une heure nocturne",
    "ACTIVITE_INTENSE_24H": "Activité inhabituellement élevée sur 24h",
    "RAS_SIGNAL_FAIBLE": "Aucun signal fort, surveillance faible",
}