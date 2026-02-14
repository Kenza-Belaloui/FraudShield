from dataclasses import dataclass
from typing import Optional

from app.services.scoring import score_transaction_mock


@dataclass
class FraudDecision:
    score_xgb: float
    score_iforest: float
    score_final: float
    criticite: str          # FAIBLE | MOYEN | ELEVE
    raison: str
    modele_principal: str   # "XGBoost" (pour tracer idMod dans ALERTE)


def evaluate_transaction(
    montant: float,
    canal: str,
    pays: Optional[str]
) -> FraudDecision:
    """
    Moteur anti-fraude (version MOCK).
    Plus tard, cette fonction appellera les vrais modèles :
    - XGBoost (supervisé)
    - IsolationForest (anomalies)
    """
    res = score_transaction_mock(montant=montant, canal=canal, pays=pays)

    return FraudDecision(
        score_xgb=res.score_xgb,
        score_iforest=res.score_iforest,
        score_final=res.score_final,
        criticite=res.criticite,
        raison=res.raison,
        modele_principal="XGBoost"
    )
