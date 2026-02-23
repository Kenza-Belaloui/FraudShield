from typing import Any, Dict, List


def build_reason_codes(features: Dict[str, Any], score_xgb: float, score_iforest: float) -> List[str]:
    reasons: List[str] = []

    if score_iforest >= 1.0:
        reasons.append("ANOMALIE_IFOREST")

    if features.get("depasse_plafond") == 1:
        reasons.append("DEPASSE_PLAFOND_JOURNALIER")

    if features.get("is_pays_inhabituel") == 1:
        reasons.append("PAYS_INHABITUEL")

    if features.get("heure_nuit") == 1:
        reasons.append("HEURE_NOCTURNE")

    nb_tx_24h = features.get("nb_tx_24h", 0)
    if isinstance(nb_tx_24h, int) and nb_tx_24h >= 10:
        reasons.append("ACTIVITE_INTENSE_24H")

    # Si rien de spécial, on met une raison par défaut
    if not reasons:
        reasons.append("RAS_SIGNAL_FAIBLE")

    return reasons