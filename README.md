# Système Intelligent de Détection de Fraude Financière

Projet de fin d’études dédié à la détection de transactions frauduleuses à l’aide d’un modèle de Machine Learning, intégré dans une architecture complète **Frontend + Backend + Microservice ML + Base de données + Docker**.

## Aperçu du projet

Ce projet a pour objectif de détecter automatiquement les transactions suspectes à partir de données financières, puis de présenter les résultats dans une interface moderne permettant l’analyse, le filtrage et la visualisation des alertes.

L’application ne se limite pas à un simple modèle de classification. Elle propose une solution complète :

* un **frontend** pour visualiser les transactions et indicateurs,
* un **backend** pour gérer les API et la logique métier,
* un **microservice Python** pour la prédiction de fraude,
* une **base de données** pour stocker les transactions,
* une **containerisation Docker** pour faciliter le déploiement.

## Objectifs

* Détecter les fraudes financières à partir de données transactionnelles.
* Exploiter un modèle de Machine Learning dans une application réelle.
* Fournir un tableau de bord interactif pour l’analyse des résultats.
* Proposer une architecture modulaire, claire et maintenable.
* Déployer l’ensemble des services de manière reproductible avec Docker.

## Fonctionnalités principales

* Détection automatique des transactions frauduleuses
* Tableau de bord statistique
* Visualisation des transactions
* Filtres et recherche
* Consultation du détail d’une transaction
* Communication entre backend et service ML
* Export de rapports
* Exécution multi-services avec Docker

## Architecture technique

Le projet repose sur une architecture en plusieurs couches :

### 1. Frontend

Interface utilisateur permettant :

* la consultation des transactions,
* l’affichage des statistiques,
* les graphiques de synthèse,
* l’analyse visuelle des prédictions.

### 2. Backend

Le backend gère :

* les routes API,
* la récupération des données,
* la logique métier,
* la communication avec le microservice Machine Learning.

### 3. Microservice Machine Learning

Le service Python prend en charge :

* le chargement du modèle entraîné,
* le prétraitement des données,
* la prédiction de fraude,
* le renvoi du score ou de la classe au backend.

### 4. Base de données

Elle stocke les données transactionnelles, les résultats d’analyse et les informations nécessaires à l’application.

### 5. Docker

Docker permet :

* d’isoler les services,
* de simplifier le lancement du projet,
* de garantir un environnement cohérent sur différentes machines.

## Technologies utilisées

### Frontend

* React / Next.js / autre selon votre stack
* Tailwind CSS / CSS / autre selon votre implémentation
* Bibliothèques de visualisation

### Backend

* Node.js
* Express.js

### Machine Learning

* Python
* Pandas
* NumPy
* Scikit-learn
* Joblib / Pickle

### Base de données

* MongoDB / PostgreSQL / MySQL selon votre projet

### DevOps

* Docker
* Docker Compose

> Remplacez les technologies génériques ci-dessus par celles réellement utilisées dans votre projet avant l’envoi au professeur.

## Structure du dépôt

```bash
project-root/
├── frontend/          # Interface utilisateur
├── backend/           # API et logique métier
├── ml-service/        # Microservice Python pour la prédiction
├── dataset/           # Jeux de données (si autorisés)
├── model/             # Modèles entraînés
├── docs/              # Captures, rapport, schémas
├── docker-compose.yml
├── .env.example
└── README.md
```

## Flux de fonctionnement

1. L’utilisateur consulte les transactions depuis l’interface.
2. Le frontend envoie des requêtes au backend.
3. Le backend récupère les données et interagit avec le service ML.
4. Le microservice exécute le modèle de prédiction.
5. Le résultat est renvoyé au backend puis affiché dans le frontend.
6. Le tableau de bord présente les statistiques et les alertes détectées.

## Machine Learning

Le module de Machine Learning constitue le cœur intelligent du projet.

### Étapes principales

* Préparation et nettoyage des données
* Sélection des variables pertinentes
* Entraînement du modèle
* Évaluation des performances
* Sérialisation du modèle
* Intégration dans un microservice exploitable par l’application

### Points techniques à mettre en avant

* gestion du déséquilibre des classes,
* choix du modèle de classification,
* métriques d’évaluation,
* importance des features,
* intégration du modèle dans une architecture logicielle réelle.

## Installation et exécution

### 1. Cloner le dépôt

```bash
git clone <URL_DU_DEPOT>
cd <NOM_DU_DEPOT>
```

### 2. Configurer les variables d’environnement

Créer les fichiers `.env` nécessaires à partir de `.env.example`.

### 3. Lancer avec Docker

```bash
docker-compose up --build
```

### 4. Lancer manuellement (optionnel)

#### Backend

```bash
cd backend
npm install
npm run dev
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

#### ML Service

```bash
cd ml-service
pip install -r requirements.txt
python app.py
```

## Captures d’écran

Ajouter ici :

* tableau de bord,
* page des transactions,
* page détail transaction,
* graphiques,
* résultats de prédiction.

Exemple :

```md
![Dashboard](docs/dashboard.png)
![Transactions](docs/transactions.png)
```

## Résultats attendus

Le système permet :

* d’identifier les transactions suspectes,
* de centraliser l’analyse dans une interface unique,
* de relier l’intelligence artificielle à une application métier exploitable,
* de démontrer une approche complète de bout en bout.

## Points forts du projet

* Architecture modulaire
* Intégration réelle du Machine Learning
* Visualisation des données
* Déploiement avec Docker
* Projet orienté cas d’usage concret
* Bonne séparation des responsabilités entre services

## Limites actuelles

* dépendance à la qualité des données,
* performances du modèle liées au dataset d’entraînement,
* certaines améliorations UI/UX peuvent encore être ajoutées,
* export et reporting pouvant être enrichis selon les besoins.

## Améliorations futures

* amélioration continue du modèle,
* optimisation des visualisations,
* export PDF plus avancé,
* ajout d’alertes temps réel,
* authentification et gestion des rôles,
* déploiement cloud.

## Auteur

* **Nom Prénom**
* Projet de Fin d’Études
* Établissement / Université
* Année universitaire : 2025–2026

## Licence

Ce projet a été réalisé dans un cadre académique.

---

## Version courte pour la description GitHub

**Application intelligente de détection de fraude financière basée sur le Machine Learning, avec architecture complète Frontend / Backend / Microservice Python / Base de données / Docker.**

## Topics GitHub conseillés

```text
machine-learning fraud-detection fintech dashboard nodejs python react docker microservices data-science pfe
```
