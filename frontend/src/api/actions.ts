import { api } from "./client";

export async function simulateFlux(count: number = 30) {
  const res = await api.post("/transactions/simulate", null, { params: { count } });
  return res.data;
}

export async function downloadAlertsCsv() {
  const res = await api.get("/alerts/export.csv", {
    responseType: "blob",
  });

  const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "fraudshield_alerts_export.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();

  window.URL.revokeObjectURL(url);
}