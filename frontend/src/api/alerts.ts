import { api } from "./client";

export async function listAlerts(params: { page?: number; page_size?: number; criticite?: string }) {
  const res = await api.get("/alertes", { params });
  return res.data;
}