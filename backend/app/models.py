import uuid
from sqlalchemy import (
    Column, String, Boolean, DateTime, ForeignKey,
    Numeric, Integer, Text, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy import Numeric
from sqlalchemy.dialects.postgresql import JSONB, ARRAY
from sqlalchemy import Text

from .db import Base


# ---------- Sécurité ----------
class Role(Base):
    __tablename__ = "roles"

    idr = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nom = Column(String(50), unique=True, nullable=False)

    utilisateurs = relationship("Utilisateur", back_populates="role")


class Utilisateur(Base):
    __tablename__ = "utilisateurs"

    iduser = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nom_complet = Column(String(120), nullable=False)
    email = Column(String(120), unique=True, nullable=False)
    mot_de_passe_hash = Column(String(255), nullable=False)
    actif = Column(Boolean, nullable=False, default=True)
    date_creation = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    idr = Column(UUID(as_uuid=True), ForeignKey("roles.idr"), nullable=False)
    role = relationship("Role", back_populates="utilisateurs")

    validations = relationship("Validation", back_populates="utilisateur")


# ---------- Métier ----------
class Client(Base):
    __tablename__ = "clients"

    idclient = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nom = Column(String(80), nullable=False)
    prenom = Column(String(80), nullable=True)
    reference_externe = Column(String(80), unique=True, nullable=True)
    segment = Column(String(50), nullable=True)
    date_creation = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    pays_residence = Column(String(80), nullable=True)
    profession = Column(String(80), nullable=True)
    revenu_mensuel_estime = Column(Numeric(12, 2), nullable=True)
    plafond_carte_journalier = Column(Numeric(12, 2), nullable=True)

    cartes = relationship("Carte", back_populates="client")
    transactions = relationship("Transaction", back_populates="client")


class Carte(Base):
    __tablename__ = "cartes"

    idcarte = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pan_masque = Column(String(30), nullable=False)  # ex: 1234********5678
    emetteur = Column(String(50), nullable=True)
    mois_expiration = Column(Integer, nullable=True)
    annee_expiration = Column(Integer, nullable=True)

    idclient = Column(UUID(as_uuid=True), ForeignKey("clients.idclient"), nullable=False)
    client = relationship("Client", back_populates="cartes")

    transactions = relationship("Transaction", back_populates="carte")


class Commercant(Base):
    __tablename__ = "commercants"

    idcommercant = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nom = Column(String(120), nullable=False)
    categorie = Column(String(80), nullable=True)
    pays = Column(String(80), nullable=True)
    ville = Column(String(80), nullable=True)

    transactions = relationship("Transaction", back_populates="commercant")


class Transaction(Base):
    __tablename__ = "transactions"

    idtransac = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    date_heure = Column(DateTime(timezone=True), nullable=False)  # UTC
    montant = Column(Numeric(12, 2), nullable=False)
    devise = Column(String(10), nullable=False, default="EUR")
    canal = Column(String(20), nullable=False)   # POS | E_COMMERCE | DAB
    statut = Column(String(20), nullable=False)  # ACCEPTEE | REFUSEE | EN_ATTENTE

    idclient = Column(UUID(as_uuid=True), ForeignKey("clients.idclient"), nullable=False)
    idcarte = Column(UUID(as_uuid=True), ForeignKey("cartes.idcarte"), nullable=False)
    idcommercant = Column(UUID(as_uuid=True), ForeignKey("commercants.idcommercant"), nullable=False)

    client = relationship("Client", back_populates="transactions")
    carte = relationship("Carte", back_populates="transactions")
    commercant = relationship("Commercant", back_populates="transactions")

    predictions = relationship("PredictionModele", back_populates="transaction")
    alerte = relationship("Alerte", back_populates="transaction", uselist=False)

    features = Column(JSONB, nullable=True)
    reason_codes = Column(ARRAY(Text), nullable=True)

# ---------- IA ----------
class PredictionModele(Base):
    __tablename__ = "predictions_modele"

    idmod = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nom_modele = Column(String(50), nullable=False)       # XGBoost / IsolationForest
    version_modele = Column(String(50), nullable=True)
    score_risque = Column(Numeric(6, 4), nullable=False)  # 0..1
    est_anomalie = Column(Boolean, nullable=False, default=False)
    seuil = Column(Numeric(6, 4), nullable=True)
    date_creation = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    idtransac = Column(UUID(as_uuid=True), ForeignKey("transactions.idtransac"), nullable=False)
    transaction = relationship("Transaction", back_populates="predictions")

    alertes = relationship("Alerte", back_populates="prediction_principale")


# ---------- Alerting ----------
class Alerte(Base):
    __tablename__ = "alertes"

    idalerte = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    criticite = Column(String(10), nullable=False)  # FAIBLE | MOYEN | ELEVE
    statut = Column(String(15), nullable=False, default="OUVERTE")  # OUVERTE | EN_COURS | CLOTUREE
    raison = Column(Text, nullable=True)
    date_creation = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    date_cloture = Column(DateTime(timezone=True), nullable=True)

    # 1 alerte par transaction (choix A)
    idtransac = Column(UUID(as_uuid=True), ForeignKey("transactions.idtransac"), nullable=False, unique=True)
    transaction = relationship("Transaction", back_populates="alerte")

    # trace de la prédiction "principale" utilisée pour la criticité
    idmod = Column(UUID(as_uuid=True), ForeignKey("predictions_modele.idmod"), nullable=True)
    prediction_principale = relationship("PredictionModele", back_populates="alertes")

    validations = relationship("Validation", back_populates="alerte")


class Validation(Base):
    __tablename__ = "validations"

    idval = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    decision = Column(String(15), nullable=False)  # FRAUDE | LEGITIME
    commentaire = Column(Text, nullable=False)  # obligatoire (choix A)
    date_creation = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    idalerte = Column(UUID(as_uuid=True), ForeignKey("alertes.idalerte"), nullable=False)
    iduser = Column(UUID(as_uuid=True), ForeignKey("utilisateurs.iduser"), nullable=False)

    alerte = relationship("Alerte", back_populates="validations")
    utilisateur = relationship("Utilisateur", back_populates="validations")

