import { jsPDF } from "jspdf";
import { formatSEK } from "./format";

export type ContractPdfMeta = {
  companyName: string;
  eventType: string;
  eventDate?: string | null;
  price: number;
  language: string; // "en" | "sv"
  generatedByName?: string | null;
};

const RED: [number, number, number] = [196, 30, 58]; // #C41E3A
const INK: [number, number, number] = [40, 38, 35];
const GRAY: [number, number, number] = [120, 116, 110];

/** Renders the filled contract text as a clean A4 PDF and triggers download. */
export function downloadContractPdf(body: string, meta: ContractPdfMeta) {
  const sv = meta.language === "sv";
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 24;
  const width = pageW - margin * 2;

  // Brand mark: downward triangle
  doc.setFillColor(...RED);
  doc.triangle(margin, 18, margin + 9, 18, margin + 4.5, 25.6, "F");

  doc.setTextColor(...GRAY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("UU AI SOCIETY  ·  UPPSALA", margin + 14, 21);
  doc.setFont("helvetica", "normal");
  doc.text(sv ? "Events & Partnerships" : "Events & Partnerships", margin + 14, 25);

  doc.setTextColor(...INK);
  doc.setFont("times", "normal");
  doc.setFontSize(22);
  doc.text(sv ? "Samarbetsvillkor" : "Partnership Terms", margin, 42);

  // Meta ledger rows
  const rows: [string, string][] = [
    [sv ? "Företag" : "Company", meta.companyName || "—"],
    [sv ? "Typ av event" : "Event type", meta.eventType],
    [sv ? "Datum" : "Event date", meta.eventDate || (sv ? "Ej fastställt" : "To be decided")],
    [sv ? "Pris" : "Price", formatSEK(meta.price)],
  ];
  let y = 52;
  doc.setDrawColor(210, 206, 200);
  doc.setLineWidth(0.25);
  doc.line(margin, y, margin + width, y);
  for (const [label, value] of rows) {
    y += 7;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY);
    doc.text(label.toUpperCase(), margin, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    doc.text(value, margin + 42, y);
    doc.line(margin, y + 2.5, margin + width, y + 2.5);
  }

  // Body
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(...INK);
  const lineHeight = 5.4;
  for (const para of body.split(/\n/)) {
    const lines = para.trim() === "" ? [""] : (doc.splitTextToSize(para, width) as string[]);
    for (const line of lines) {
      if (y > pageH - 30) {
        doc.addPage();
        y = margin;
      }
      if (line !== "") doc.text(line, margin, y);
      y += lineHeight;
    }
  }

  // Footer
  const generated = new Date().toLocaleDateString("sv-SE");
  doc.setDrawColor(210, 206, 200);
  doc.line(margin, pageH - 18, margin + width, pageH - 18);
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY);
  doc.text(
    `${sv ? "Genererad" : "Generated"} ${generated}${meta.generatedByName ? ` · ${meta.generatedByName}` : ""} · UU AI Society`,
    margin,
    pageH - 13,
  );

  const safeCompany = (meta.companyName || "contract")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "");
  doc.save(`UUAIS-terms-${safeCompany}-${generated}.pdf`);
}
