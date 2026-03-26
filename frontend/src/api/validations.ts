import { api } from "./client";

export async function createValidation(payload: {
  idAlerte: string;
  decision: "FRAUDE" | "LEGITIME";
  commentaire: string;
}) {
  const res = await api.post("/validations", payload);
  return res.data;
}