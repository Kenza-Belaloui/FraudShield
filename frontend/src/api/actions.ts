import { api } from "./client";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export async function simulateFlux(count: number = 30) {
  const res = await api.post("/transactions/simulate", null, {
    params: { count },
  });
  return res.data;
}

function extractFilename(contentDisposition?: string | null) {
  if (!contentDisposition) return "fraudshield_alerts_export.csv";
  const match = contentDisposition.match(/filename="?([^"]+)"?/i);
  return match?.[1] || "fraudshield_alerts_export.csv";
}

export async function downloadAlertsCsv() {
  try {
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
  } catch (error) {
    console.error("Erreur export CSV:", error);
    alert("Échec de l'export CSV.");
  }
}

type ExportAlertRow = {
  numero: number;
  criticite: string;
  statut: string;
  score: string;
  client: string;
  commercant: string;
  montant: string;
  canal: string;
  date: string;
};

export function downloadAlertsPdf(rows: ExportAlertRow[]) {
  try {
    const doc = new jsPDF();

    doc.setFillColor(10, 25, 50);
    doc.rect(0, 0, 210, 24, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text("FraudShield - Rapport d'alertes", 14, 15);

    doc.setTextColor(70, 70, 70);
    doc.setFontSize(10);
    doc.text(`Généré le : ${new Date().toLocaleString()}`, 14, 32);
    doc.text(`Nombre d'alertes : ${rows.length}`, 14, 38);

    autoTable(doc, {
      startY: 45,
      head: [[
        "N°",
        "Criticité",
        "Statut",
        "Score",
        "Client",
        "Commerçant",
        "Montant",
        "Canal",
        "Date",
      ]],
      body: rows.map((r) => [
        r.numero,
        r.criticite,
        r.statut,
        r.score,
        r.client,
        r.commercant,
        r.montant,
        r.canal,
        r.date,
      ]),
      theme: "grid",
      headStyles: {
        fillColor: [10, 25, 50],
        textColor: [255, 255, 255],
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [40, 40, 40],
      },
      alternateRowStyles: {
        fillColor: [245, 248, 252],
      },
      styles: {
        cellPadding: 3,
        lineColor: [220, 225, 230],
        lineWidth: 0.2,
      },
      margin: { left: 8, right: 8 },
    });

    doc.save("fraudshield_alertes.pdf");
  } catch (error) {
    console.error("Erreur export PDF:", error);
    alert("Échec de l'export PDF.");
  }
}