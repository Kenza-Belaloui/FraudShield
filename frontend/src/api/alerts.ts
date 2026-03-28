import { api } from "./client";

export async function simulateFlux(count: number = 30) {
  const res = await api.post("/transactions/simulate", null, { params: { count } });
  return res.data;
}

function extractFilename(contentDisposition?: string | null) {
  if (!contentDisposition) return "fraudshield_alerts_export.csv";
  const match = contentDisposition.match(/filename="?([^"]+)"?/i);
  return match?.[1] || "fraudshield_alerts_export.csv";
}

export async function downloadAlertsCsv() {
  const res = await api.get("/alerts/export.csv", {
    responseType: "blob",
  });

  const contentType = res.headers["content-type"] || "text/csv;charset=utf-8;";
  const filename = extractFilename(res.headers["content-disposition"]);

  const blob = new Blob([res.data], { type: contentType });
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => {
    window.URL.revokeObjectURL(url);
  }, 500);
}