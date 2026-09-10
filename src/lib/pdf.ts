import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type PdfSection = { title: string; lines: string[] };

export async function buildAppraisalPdf(opts: {
  title: string;
  doctorName: string;
  gmcNumber: string;
  appraiserName: string | null;
  year: number;
  status: string;
  meetingDate?: Date | null;
  signedOffAt?: Date | null;
  sections: PdfSection[];
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const pageW = 595.28; // A4
  const pageH = 841.89;
  const margin = 56;
  const fontSize = 10;
  const lineH = 14;

  let page = doc.addPage([pageW, pageH]);
  let y = pageH - margin;

  function newPage() {
    page = doc.addPage([pageW, pageH]);
    y = pageH - margin;
  }

  function ensureSpace(needed: number) {
    if (y - needed < margin + 20) newPage();
  }

  function wrap(text: string, maxWidth: number, size = fontSize): string[] {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const candidate = line ? line + " " + word : word;
      if (font.widthOfTextAtSize(candidate, size) > maxWidth) {
        if (line) lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
    return lines.length ? lines : [""];
  }

  function sanitize(text: string): string {
    // Helvetica (WinAnsi) cannot encode e.g. "→" or "—" as-is; pdf-lib throws.
    // Keep output ASCII-safe: transliterate the handful of symbols we emit.
    return text
      .replace(/—/g, "-")
      .replace(/–/g, "-")
      .replace(/→/g, "->")
      .replace(/—/g, "-");
  }

  function write(text: string, opts2: { size?: number; bold?: boolean; indent?: number; gap?: number } = {}) {
    const raw = sanitize(text);
    const size = opts2.size ?? fontSize;
    const indent = opts2.indent ?? 0;
    const lines = wrap(raw, pageW - margin * 2 - indent, size);
    for (const line of lines) {
      ensureSpace(lineH);
      page.drawText(line, { x: margin + indent, y, size, font: opts2.bold ? bold : font, color: rgb(0.1, 0.1, 0.12) });
      y -= lineH;
    }
    y -= opts2.gap ?? 2;
  }

  // Header block
  write(opts.title, { size: 16, bold: true, gap: 4 });
  write(`Doctor: ${opts.doctorName}    GMC: ${opts.gmcNumber || "—"}`, { gap: 1 });
  write(`Appraiser: ${opts.appraiserName ?? "not assigned"}    Appraisal year: ${opts.year}/${String(opts.year + 1).slice(2)}`, { gap: 1 });
  write(`Status: ${opts.status.replace(/_/g, " ")}${opts.signedOffAt ? `    Signed off: ${opts.signedOffAt.toISOString().slice(0, 10)}` : ""}${opts.meetingDate ? `    Meeting: ${opts.meetingDate.toISOString().slice(0, 10)}` : ""}`, { gap: 8 });

  for (const section of opts.sections) {
    ensureSpace(lineH * 2);
    write(section.title, { size: 12, bold: true, gap: 3 });
    if (section.lines.length === 0) {
      write("(no data recorded)", { indent: 12 });
      continue;
    }
    for (const line of section.lines) {
      if (line.startsWith("## ")) {
        write(line.slice(3), { bold: true, indent: 12, gap: 1 });
      } else {
        write(line, { indent: 12, gap: 1 });
      }
    }
    y -= 6;
  }

  return doc.save();
}

export function flattenSectionData(prefix: string, data: Record<string, unknown>): string[] {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(data)) {
    const label = key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
    if (value === null || value === undefined || value === "") continue;
    if (typeof value === "boolean") {
      lines.push(`${label}: ${value ? "Yes" : "No"}`);
    } else if (Array.isArray(value)) {
      lines.push(`## ${label}`);
      for (const item of value) {
        if (typeof item === "object" && item !== null) {
          const parts = Object.entries(item as Record<string, unknown>)
            .filter(([, v]) => v !== "" && v !== null && v !== undefined)
            .map(([k, v]) => `${k.replace(/([A-Z])/g, " $1")}: ${v}`);
          lines.push(`- ${parts.join("; ")}`);
        } else if (String(item).trim()) {
          lines.push(`- ${String(item)}`);
        }
      }
    } else {
      lines.push(`${label}: ${String(value)}`);
    }
  }
  void prefix;
  return lines;
}
