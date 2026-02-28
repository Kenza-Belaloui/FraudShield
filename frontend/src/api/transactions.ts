import { api } from "./client";

export async function listTransactions(params: { page?: number; page_size?: number }) {
  const res = await api.get("/transactions", { params });
  return res.data;
}