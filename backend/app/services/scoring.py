from dataclasses import dataclass
from typing import Optional


@dataclass
class ScoreResult:
    score_xgb: float          # 0..1
    score_iforest: float      # 0..1 (normalisé)
    score_final: float        # 0..1
    criticite: str            # FAIBLE | MOYEN | ELEVE
    raison: str


def _to_criticite(score_final: float) -> str:
    if score_final < 0.4:
        return "FAIBLE"
    if score_final < 0.7:
        return "MOYEN"
    return "ELEVE"


def score_transaction_mock(montant: float, canal: str, pays: Optional[str]) -> ScoreResult:
    """
    Scoring MOCK (pas ML). Logique simple mais crédible:
    - montant élevé => risque ↑
    - e-commerce => risque ↑
    - pays != France => risque ↑
    Retourne 2 scores + un score consolidé.
    """
    base = 0.10

    # montant
    if montant >= 1000:
        base += 0.55
    elif montant >= 300:
        base += 0.25
    elif montant >= 100:
        base += 0.10

    # canal
    canal = (canal or "").upper()
    if canal == "E_COMMERCE":
        base += 0.15
    elif canal == "DAB":
        base += 0.10

    # pays
    if pays and pays.lower() != "france":
        base += 0.25

    # score "xgb" mock
    score_xgb = min(max(base, 0.0), 1.0)

    # score "iforest" mock (anomalie)
    # on le rend légèrement différent
    score_iforest = min(max(base - 0.05, 0.0), 1.0)

    score_final = max(score_xgb, score_iforest)
    criticite = _to_criticite(score_final)

    raison = "Score mock basé sur montant/canal/pays"
    return ScoreResult(
        score_xgb=score_xgb,
        score_iforest=score_iforest,
        score_final=score_final,
        criticite=criticite,
        raison=raison
    )
