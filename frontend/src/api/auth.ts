import { api } from "./client";

export type LoginPayload = { email: string; password: string };
export type LoginResponse = { access_token: string; token_type?: string };

export async function login(payload: LoginPayload) {
  const res = await api.post<LoginResponse>("/auth/login", payload);
  return res.data;
}

/**
 * Option 1 (recommandé) : backend expose /auth/me
 * Si tu n'as pas /auth/me -> on fait fallback "Admin".
 */
export async function me() {
  const res = await api.get<{ nom?: string; prenom?: string; email?: string }>("/auth/me");
  return res.data;
}