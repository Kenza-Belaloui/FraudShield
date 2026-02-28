import { api } from "./client";

export type DashboardSummary = {
  transactions_24h: number;
  alertes_actives: number;
  taux_fraude_7j: number;
  temps_moyen_analyse_ms: number;
  criticite_distribution_7j: Record<string, number>;
  recent_alerts: Array<{
    idAlerte: string;
    date_creation: string;
    criticite: string;
    statut: string;
    raison: string | null;
    score_final: number;
    idTransac: string | null;
  }>;
};

export async function getDashboardSummary() {
  const res = await api.get<DashboardSummary>("/dashboard/summary");
  return res.data;
}