import { api } from "./client";

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
  const res = await api.get("/alerts", { params });
  return res.data;
}