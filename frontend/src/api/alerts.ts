import { api } from "./client";

export type AlertReasonDetail = {
  code: string;
  label: string;
};

export type AlertValidation = {
  idValidation: string;
  decision: "FRAUDE" | "LEGITIME";
  commentaire: string;
  date_creation?: string | null;
  utilisateur?: {
    idUser?: string | null;
    nom_complet?: string | null;
    email?: string | null;
  } | null;
};

export type AlertItem = {
  idAlerte: string;
  criticite: "FAIBLE" | "MOYEN" | "ELEVE";
  statut: "OUVERTE" | "EN_COURS" | "CLOTUREE";
  raison?: string | null;
  date_creation: string;
  date_cloture?: string | null;
  score_final: number | null;
  transaction: {
    idTransac: string;
    date_heure: string;
    montant: number;
    devise: string;
    canal: string;
    statut: string;
  };
  client: { nom: string; prenom?: string | null };
  commercant: { nom: string; categorie?: string | null; pays?: string | null; ville?: string | null };
  reason_codes?: string[] | null;
  reason_details?: AlertReasonDetail[] | null;
  latest_validation?: AlertValidation | null;
};

export type AlertDetail = AlertItem & {
  features?: any;
  validations?: AlertValidation[];
};

export type AlertsResponse = {
  items: AlertItem[];
  page: number;
  page_size: number;
  total: number;
};

export async function listAlerts(params: {
  page?: number;
  page_size?: number;
  criticite?: string;
  statut?: string;
  date_debut?: string;
  date_fin?: string;
  montant_min?: number;
  montant_max?: number;
  search?: string;
}) {
  const res = await api.get<AlertsResponse>("/alerts", { params });
  return res.data;
}

export async function getAlert(id: string) {
  const res = await api.get<AlertDetail>(`/alerts/${id}`);
  return res.data;
}

export async function takeAlert(id: string) {
  const res = await api.post(`/alerts/${id}/take`);
  return res.data;
}