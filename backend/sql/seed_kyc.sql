UPDATE clients
SET
  pays_residence = 'France',
  profession = 'Ingénieur',
  revenu_mensuel_estime = 3500,
  plafond_carte_journalier = 2000
WHERE reference_externe = 'CLT-0001';
