import axios from "axios";

export type DashboardStats = {
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

const API_BASE = "http://127.0.0.1:8000";

export async function getDashboardStats(token?: string) {
  const res = await axios.get<DashboardStats>(`${API_BASE}/alerts/dashboard`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return res.data;
}