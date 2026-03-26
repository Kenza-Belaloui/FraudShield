import { api } from "./client";

export type TxReasonDetail = {
  code: string;
  label: string;
};

export type TxItem = {
  idTransac: string;
  date_heure: string;
  montant: number;
  devise: string;
  canal: string;
  statut: string;
  client?: { nom: string; prenom?: string | null } | null;
  commercant?: { nom: string } | null;
  alerte?: {
    idAlerte?: string | null;
    criticite?: string | null;
    statut?: string | null;
    score_final?: number | null;
    raison?: string | null;
    date_creation?: string | null;
    date_cloture?: string | null;
  } | null;
  features?: any;
  reason_codes?: string[] | null;
  reason_details?: TxReasonDetail[] | null;
};

export type TxListResponse = {
  items: TxItem[];
  page: number;
  page_size: number;
  total: number;
};

export async function listTransactions(params: { page?: number; page_size?: number; q?: string }) {
  const res = await api.get<TxListResponse>("/transactions", { params });
  return res.data;
}

export async function getTransaction(id: string) {
  const res = await api.get<TxItem>(`/transactions/${id}`);
  return res.data;
}