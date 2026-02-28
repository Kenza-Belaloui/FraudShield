import { api } from "./client";

export type LoginPayload = { email: string; password: string };
export type LoginResponse = {
  access_token: string;
  token_type: string;
  role: string;
  user_id: string;
  nom_complet: string;
  email: string;
};

export async function login(payload: LoginPayload) {
  const res = await api.post<LoginResponse>("/auth/login", payload);
  return res.data;
}

export async function me() {
  const res = await api.get<{ nom?: string; prenom?: string; email?: string; role?: string }>("/auth/me");
  return res.data;
}