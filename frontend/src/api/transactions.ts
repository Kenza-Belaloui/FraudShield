import { api } from "./client";

export async function listTransactions(params: { page?: number; page_size?: number; q?: string }) {
  const res = await api.get("/transactions", { params });
  return res.data;
}