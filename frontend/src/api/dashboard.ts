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
    raison: string;
    score_final: number;
    idTransac: string;
  }>;
};

export type DashboardTimeseries = {
  days: number;
  series: Array<{
    date: string;
    transactions: number;
    alertes: number;
    fraude_eleve: number;
    taux_fraude: number;
  }>;
};

export async function getDashboardSummary() {
  const res = await api.get<DashboardSummary>("/dashboard/summary");
  return res.data;
}

export async function getDashboardTimeseries(days: number = 7) {
  const res = await api.get<DashboardTimeseries>("/dashboard/timeseries", { params: { days } });
  return res.data;
}