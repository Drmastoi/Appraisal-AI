import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { PDFFont, PDFPage } from "pdf-lib";

// ── NHS Identity palette ─────────────────────────────────────────────────
// Solid colour is reserved for accent bars, chips and small markers; fills
// are high-white tints so the document stays calm and print-friendly.
type Tone = { r: number; g: number; b: number };

const NHS = {
  blue:       { r: 0,       g: 94 / 255,  b: 184 / 255 }, // #005eb8
  darkBlue:   { r: 0,       g: 48 / 255,  b: 135 / 255 }, // #003087
  black:      { r: 33 / 255, g: 43 / 255, b: 50 / 255 },  // #212b32
  darkGrey:   { r: 76 / 255, g: 98 / 255, b: 114 / 255 }, // #4c6272
  midGrey:    { r: 118 / 255, g: 134 / 255, b: 146 / 255 }, // #768692
  borderGrey: { r: 216 / 255, g: 221 / 255, b: 224 / 255 }, // #d8dde0
  green:      { r: 0,       g: 150 / 255, b: 57 / 255 },  // #009639
  aqua:       { r: 0,       g: 169 / 255, b: 206 / 255 }, // #00a9ce
  amber:      { r: 122 / 255, g: 77 / 255, b: 0 },        // darkened warm yellow for text
  amberBase:  { r: 1,       g: 184 / 255, b: 28 / 255 },  // #ffb81c
  red:        { r: 178 / 255, g: 29 / 255, b: 22 / 255 }, // darkened #da291c for text
} as const;

const rgbOf = (t: Tone) => rgb(t.r, t.g, t.b);
const tint = (t: Tone, white: number): Tone => ({
  r: t.r * (1 - white) + white,
  g: t.g * (1 - white) + white,
  b: t.b * (1 - white) + white,
});

const STATUS_TONES: Record<string, Tone> = {
  DRAFT: NHS.midGrey,
  SUBMITTED: NHS.blue,
  IN_REVIEW: NHS.amberBase,
  SIGNED_OFF: NHS.green,
};
const STATUS_TEXT: Record<string, Tone> = {
  DRAFT: NHS.darkGrey,
  SUBMITTED: NHS.blue,
  IN_REVIEW: NHS.amber,
  SIGNED_OFF: NHS.green,
};

const BRAND_NAME = "AppraisalPortal UK";
const BRAND_TAG = "UK medical appraisal · MAG 2022";
const FOOTER_NOTE = "AppraisalPortal UK · Confidential appraisal data — handled under UK GDPR";

// ── Page geometry (A4) ───────────────────────────────────────────────────
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN_LEFT = 56;
const MARGIN_RIGHT = 56;
const MARGIN_TOP = 76; // content top on page 1 sits below the brand bar
const MARGIN_CONT_TOP = 56; // content top on continuation pages
const MARGIN_BOTTOM = 58;
const CONTENT_W = PAGE_W - MARGIN_LEFT - MARGIN_RIGHT;

const BODY_SIZE = 9.5;
const SMALL_SIZE = 8.5;
const LINE = 1.42; // line-height multiplier

export type PdfSection = { title: string; lines: string[] };

export type ChartDatum = { label: string; value: number };
export type PdfCharts = {
  cpdTotal?: number;
  cpdEntries?: number;
  cpdByCategory?: ChartDatum[];
  colleagueResponses?: number;
  patientResponses?: number;
  colleagueDomains?: ChartDatum[];
  patientDomains?: ChartDatum[];
};

function sanitize(text: string): string {
  // Helvetica (WinAnsi) cannot encode e.g. "→" as-is; pdf-lib throws.
  // Transliterate the handful of symbols we emit and strip marker glyphs.
  return text
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/→/g, "->")
    .replace(/[✓✔]/g, "")
    .replace(/×/g, "x")
    .replace(/\u00a0/g, " ");
}

function fmtDate(d?: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : "-";
}

export async function buildAppraisalPdf(opts: {
  title: string;
  doctorName: string;
  gmcNumber: string;
  appraiserName: string | null;
  year: number;
  status: string;
  meetingDate?: Date | null;
  signedOffAt?: Date | null;
  designatedBody?: string | null;
  revalidationDueDate?: Date | null;
  charts?: PdfCharts;
  sections: PdfSection[];
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const yy = String(opts.year + 1).slice(2);
  doc.setTitle(`${opts.title} — ${opts.doctorName} (${opts.year}/${yy})`);
  doc.setAuthor(BRAND_NAME);
  doc.setSubject("MAG 2022 medical appraisal record for GMC revalidation");
  doc.setCreator(BRAND_NAME);

  const reg = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique);

  const pages: PDFPage[] = [];
  let cur = doc.addPage([PAGE_W, PAGE_H]);
  pages.push(cur);
  let y = PAGE_H - MARGIN_TOP;

  function addPage() {
    cur = doc.addPage([PAGE_W, PAGE_H]);
    pages.push(cur);
    // Continuation running head: slim rule + small grey brand line.
    cur.drawRectangle({ x: 0, y: PAGE_H - 30, width: PAGE_W, height: 0.75, color: rgbOf(NHS.borderGrey) });
    cur.drawText(BRAND_NAME, { x: MARGIN_LEFT, y: PAGE_H - 21, size: 7.5, font: reg, color: rgbOf(NHS.midGrey) });
    const right = `${opts.doctorName} · ${opts.year}/${yy}`;
    cur.drawText(right, {
      x: PAGE_W - MARGIN_RIGHT - reg.widthOfTextAtSize(right, 7.5),
      y: PAGE_H - 21,
      size: 7.5,
      font: reg,
      color: rgbOf(NHS.midGrey),
    });
    y = PAGE_H - MARGIN_CONT_TOP;
  }

  function ensureSpace(needed: number) {
    if (y - needed < MARGIN_BOTTOM) addPage();
  }

  function wrap(text: string, maxWidth: number, size: number, font: PDFFont): string[] {
    const words = sanitize(text).split(/\s+/);
    const out: string[] = [];
    let line = "";
    for (const w of words) {
      const cand = line ? line + " " + w : w;
      if (font.widthOfTextAtSize(cand, size) > maxWidth) {
        if (line) out.push(line);
        line = w;
      } else {
        line = cand;
      }
    }
    if (line) out.push(line);
    return out.length ? out : [""];
  }

  function body(
    text: string,
    o: { size?: number; font?: PDFFont; color?: Tone; indent?: number; gapAfter?: number } = {},
  ) {
    const size = o.size ?? BODY_SIZE;
    const font = o.font ?? reg;
    const color = rgbOf(o.color ?? NHS.black);
    const indent = o.indent ?? 0;
    const lh = size * LINE;
    for (const ln of wrap(text, CONTENT_W - indent, size, font)) {
      ensureSpace(lh);
      cur.drawText(ln, { x: MARGIN_LEFT + indent, y, size, font, color });
      y -= lh;
    }
    y -= o.gapAfter ?? 1.5;
  }

  function bullet(text: string, tone: Tone) {
    const lh = BODY_SIZE * LINE;
    const lines = wrap(text, CONTENT_W - 21, BODY_SIZE, reg);
    lines.forEach((ln, i) => {
      ensureSpace(lh);
      if (i === 0) {
        cur.drawRectangle({ x: MARGIN_LEFT + 13, y: y + 2.2, width: 3.4, height: 3.4, color: rgbOf(tone) });
      }
      cur.drawText(ln, { x: MARGIN_LEFT + 21, y, size: BODY_SIZE, font: reg, color: rgbOf(NHS.black) });
      y -= lh;
    });
    y -= 1;
  }

  function subhead(text: string) {
    ensureSpace(BODY_SIZE * LINE + 2);
    cur.drawText(sanitize(text), {
      x: MARGIN_LEFT + 12,
      y,
      size: BODY_SIZE + 0.5,
      font: bold,
      color: rgbOf(NHS.darkBlue),
    });
    y -= BODY_SIZE * LINE + 1;
  }

  // ── Page 1 brand bar ───────────────────────────────────────────────────
  cur.drawRectangle({ x: 0, y: PAGE_H - 44, width: PAGE_W, height: 44, color: rgbOf(NHS.blue) });
  cur.drawRectangle({ x: 0, y: PAGE_H - 48, width: PAGE_W, height: 4, color: rgbOf(NHS.darkBlue) });
  cur.drawText(BRAND_NAME, { x: MARGIN_LEFT, y: PAGE_H - 27, size: 12.5, font: bold, color: rgb(1, 1, 1) });
  cur.drawText(BRAND_TAG, {
    x: MARGIN_LEFT + bold.widthOfTextAtSize(BRAND_NAME, 12.5) + 8,
    y: PAGE_H - 26.5,
    size: 8.5,
    font: reg,
    color: rgb(0.85, 0.91, 0.97),
  });
  const tag = "Revalidation record";
  const tagW = reg.widthOfTextAtSize(tag, 7.5) + 16;
  cur.drawRectangle({
    x: PAGE_W - MARGIN_RIGHT - tagW,
    y: PAGE_H - 32,
    width: tagW,
    height: 15,
    color: rgbOf(NHS.blue),
    borderColor: rgb(1, 1, 1),
    borderWidth: 0.8,
  });
  cur.drawText(tag, {
    x: PAGE_W - MARGIN_RIGHT - tagW + 8,
    y: PAGE_H - 27.5,
    size: 7.5,
    font: reg,
    color: rgb(1, 1, 1),
  });

  // ── Title block + status chip ──────────────────────────────────────────
  cur.drawText(sanitize(opts.title), {
    x: MARGIN_LEFT,
    y,
    size: 15.5,
    font: bold,
    color: rgbOf(NHS.black),
  });

  const statusLabel = opts.status.replace(/_/g, " ").toUpperCase();
  const statusTone = STATUS_TONES[opts.status] ?? NHS.midGrey;
  const statusTextTone = STATUS_TEXT[opts.status] ?? NHS.darkGrey;
  const chipW = bold.widthOfTextAtSize(statusLabel, 7.5) + 16;
  cur.drawRectangle({
    x: PAGE_W - MARGIN_RIGHT - chipW,
    y: y - 4.5,
    width: chipW,
    height: 15,
    color: rgbOf(tint(statusTone, 0.88)),
    borderColor: rgbOf(tint(statusTone, 0.45)),
    borderWidth: 0.8,
  });
  cur.drawText(statusLabel, {
    x: PAGE_W - MARGIN_RIGHT - chipW + 8,
    y,
    size: 7.5,
    font: bold,
    color: rgbOf(statusTextTone),
  });

  y -= 20;
  cur.drawText(`Appraisal year ${opts.year}/${yy}`, {
    x: MARGIN_LEFT,
    y,
    size: 10,
    font: reg,
    color: rgbOf(NHS.blue),
  });
  y -= 10;
  cur.drawRectangle({ x: MARGIN_LEFT, y: y + 4, width: CONTENT_W, height: 0.75, color: rgbOf(NHS.blue) });
  y -= 12;

  // ── Info grid (two columns) ────────────────────────────────────────────
  const colGap = 24;
  const colW = (CONTENT_W - colGap) / 2;
  const left: [string, string][] = [
    ["Doctor", opts.doctorName],
    ["GMC number", opts.gmcNumber || "-"],
    ["Designated body", opts.designatedBody || "-"],
  ];
  const right: [string, string][] = [
    ["Appraiser", opts.appraiserName || "-"],
    ["Meeting date", fmtDate(opts.meetingDate)],
    ["Signed off", fmtDate(opts.signedOffAt)],
    ["Revalidation due", fmtDate(opts.revalidationDueDate)],
  ];
  const labelW =
    Math.max(...[...left, ...right].map(([l]) => bold.widthOfTextAtSize(l, SMALL_SIZE))) + 6;

  const rows = Math.max(left.length, right.length);
  for (let i = 0; i < rows; i += 1) {
    const drawCell = (items: [string, string][], x: number): number => {
      if (i >= items.length) return 0;
      const [lbl, val] = items[i];
      ensureSpace(SMALL_SIZE * LINE + 2);
      cur.drawText(lbl, { x, y, size: SMALL_SIZE, font: bold, color: rgbOf(NHS.midGrey) });
      const vLines = wrap(val, colW - labelW, SMALL_SIZE, reg);
      vLines.forEach((vl, j) => {
        cur.drawText(vl, {
          x: x + labelW,
          y: y - j * SMALL_SIZE * LINE,
          size: SMALL_SIZE,
          font: reg,
          color: rgbOf(NHS.black),
        });
      });
      return vLines.length;
    };
    const l1 = drawCell(left, MARGIN_LEFT);
    const l2 = drawCell(right, MARGIN_LEFT + colW + colGap);
    y -= Math.max(l1, l2, 1) * SMALL_SIZE * LINE + 3.5;
  }

  y -= 6;

  // ── Sections ───────────────────────────────────────────────────────────
  const HEADING_H = 20;
  for (const sec of opts.sections) {
    ensureSpace(HEADING_H + 10);
    cur.drawRectangle({
      x: MARGIN_LEFT,
      y: y - HEADING_H,
      width: CONTENT_W,
      height: HEADING_H,
      color: rgbOf(tint(NHS.blue, 0.93)),
    });
    cur.drawRectangle({
      x: MARGIN_LEFT,
      y: y - HEADING_H,
      width: 3,
      height: HEADING_H,
      color: rgbOf(NHS.blue),
    });
    cur.drawText(sanitize(sec.title).toUpperCase(), {
      x: MARGIN_LEFT + 10,
      y: y - HEADING_H + 6.5,
      size: 9.5,
      font: bold,
      color: rgbOf(NHS.darkBlue),
    });
    y -= HEADING_H + 7;

    if (sec.lines.length === 0) {
      body("(no data recorded)", { indent: 12, font: italic, color: NHS.midGrey });
    } else {
      for (const line of sec.lines) {
        if (line.startsWith("## ")) subhead(line.slice(3));
        else if (line.startsWith("- ")) bullet(line.slice(2), NHS.blue);
        else if (line.startsWith("✓ ")) bullet(line.slice(2), NHS.green);
        else if (line.startsWith("× ")) bullet(line.slice(2), NHS.red);
        else body(line, { indent: 12 });
      }
    }
    y -= 8;
  }

  // ── Charts page (optional) ───────────────────────────────────────
  const charts = opts.charts;
  if (charts && ((charts.cpdByCategory?.length ?? 0) > 0 || (charts.colleagueDomains?.length ?? 0) > 0 || (charts.patientDomains?.length ?? 0) > 0)) {
    addPage();

    cur.drawText("APPRAISAL AT A GLANCE", {
      x: MARGIN_LEFT,
      y,
      size: 15.5,
      font: bold,
      color: rgbOf(NHS.black),
    });
    y -= 18;
    cur.drawText(
      `Visual summary of supporting information · ${opts.doctorName} · ${opts.year}/${yy}`,
      { x: MARGIN_LEFT, y, size: 9.5, font: reg, color: rgbOf(NHS.blue) },
    );
    y -= 12;
    cur.drawRectangle({ x: MARGIN_LEFT, y: y + 4, width: CONTENT_W, height: 0.75, color: rgbOf(NHS.blue) });
    y -= 16;

    // Summary stat chips row: CPD points · CPD entries · response counts.
    const statDefs: [string, string][] = [
      ["CPD points", String(charts.cpdTotal ?? 0)],
      ["CPD entries", String(charts.cpdEntries ?? 0)],
      ["Colleague responses", String(charts.colleagueResponses ?? 0)],
      ["Patient responses", String(charts.patientResponses ?? 0)],
    ];
    const statGap = 12;
    const statW = (CONTENT_W - statGap * (statDefs.length - 1)) / statDefs.length;
    const statH = 34;
    statDefs.forEach(([lbl, val], i) => {
      const sx = MARGIN_LEFT + i * (statW + statGap);
      cur.drawRectangle({
        x: sx,
        y: y - statH,
        width: statW,
        height: statH,
        color: rgbOf(tint(NHS.blue, 0.95)),
        borderColor: rgbOf(NHS.borderGrey),
        borderWidth: 0.75,
      });
      cur.drawText(val, {
        x: sx + 10,
        y: y - 15,
        size: 15,
        font: bold,
        color: rgbOf(NHS.darkBlue),
      });
      cur.drawText(lbl.toUpperCase(), {
        x: sx + 10,
        y: y - 27,
        size: 7,
        font: bold,
        color: rgbOf(NHS.midGrey),
      });
    });
    y -= statH + 22;

    const DOMAIN_LABELS: Record<string, string> = {
      KNOWLEDGE_SKILLS: "Knowledge & skills",
      SAFETY_QUALITY: "Safety & quality",
      COMMUNICATION: "Communication",
      PROFESSIONALISM: "Professionalism",
    };

    /**
     * Horizontal bar chart. Bars are tone-tinted blocks with the value printed
     * at the end of the bar; the label sits above each bar.
     */
    function drawBarChart(
      heading: string,
      subtitle: string,
      data: ChartDatum[],
      o: { max: number; maxLabelRight?: string; tone: Tone; valueFmt: (v: number) => string; barH?: number },
    ) {
      if (data.length === 0) return;
      const barH = o.barH ?? 14;
      const labelGap = 4;
      const valuePad = 8;
      const valueW = 34; // reserve for the value text at bar end
      const chartX = MARGIN_LEFT + 12;
      const chartW = CONTENT_W - 12 - valueW;

      // Heading + subtitle
      ensureSpace(52 + data.length * (barH + labelGap + 6));
      cur.drawText(heading.toUpperCase(), {
        x: MARGIN_LEFT,
        y,
        size: 9.5,
        font: bold,
        color: rgbOf(NHS.darkBlue),
      });
      y -= 13;
      cur.drawText(subtitle, {
        x: MARGIN_LEFT,
        y,
        size: 8,
        font: reg,
        color: rgbOf(NHS.midGrey),
      });
      y -= 10;

      // Gridline at max (right edge of the track)
      for (const d of data) {
        const label = sanitize(d.label);
        // Track (light grey background)
        cur.drawRectangle({
          x: chartX,
          y: y - barH,
          width: chartW,
          height: barH,
          color: rgb(0.955, 0.965, 0.97),
        });
        // Bar (tinted tone, capped at track width)
        const frac = o.max > 0 ? Math.min(1, Math.max(0.02, d.value / o.max)) : 0;
        cur.drawRectangle({
          x: chartX,
          y: y - barH,
          width: Math.max(chartW * frac, 4),
          height: barH,
          color: rgbOf(tint(o.tone, 0.25 + 0.45 * (1 - frac))),
        });
        // Label above bar
        cur.drawText(label, {
          x: chartX + 1,
          y: y + labelGap + 1,
          size: 7.5,
          font: bold,
          color: rgbOf(NHS.darkGrey),
          // avoid clipping into the bar above: labels sit in the gap
        });
        // Value at bar end
        cur.drawText(o.valueFmt(d.value), {
          x: chartX + chartW * frac + valuePad,
          y: y - barH + 4,
          size: 7.5,
          font: bold,
          color: rgbOf(NHS.darkBlue),
        });
        y -= barH + labelGap + 12; // bar + label gap + row gap
      }
      y -= 6;
    }

    drawBarChart(
      "CPD points by category",
      "Points logged against activity categories across the appraisal year",
      charts.cpdByCategory ?? [],
      { max: Math.max(...(charts.cpdByCategory ?? [{ value: 1 }]).map((d) => d.value), 1), tone: NHS.blue, valueFmt: (v) => `${v} pts` },
    );

    drawBarChart(
      "Colleague feedback · GMP domain means",
      "Mean Likert score (1-5) per Good Medical Practice 2024 domain",
      (charts.colleagueDomains ?? []).map((d) => ({ ...d, label: DOMAIN_LABELS[d.label] ?? d.label })),
      { max: 5, tone: NHS.green, valueFmt: (v) => `${v.toFixed(1)}/5` },
    );

    drawBarChart(
      "Patient feedback · GMP domain means",
      "Mean Likert score (1-5) per Good Medical Practice 2024 domain",
      (charts.patientDomains ?? []).map((d) => ({...d, label: DOMAIN_LABELS[d.label] ?? d.label })),
      { max: 5, tone: NHS.aqua, valueFmt: (v) => `${v.toFixed(1)}/5` },
    );

    // Footnote
    cur.drawText(
      "Domain means are calculated only from scored responses; cycles below the MSF threshold are excluded from unblinding.",
      { x: MARGIN_LEFT, y, size: 7.5, font: italic, color: rgbOf(NHS.midGrey) },
    );
    y -= 12;
  }

  // ── Closing declaration ─────────────────────────────────────────────────
  y -= 4;
  ensureSpace(80);
  cur.drawRectangle({ x: MARGIN_LEFT, y: y + 4, width: CONTENT_W, height: 0.75, color: rgbOf(NHS.borderGrey) });
  y -= 18;
  cur.drawText("DECLARATION", { x: MARGIN_LEFT, y, size: 9.5, font: bold, color: rgbOf(NHS.darkBlue) });
  y -= 15;
  body(
    "The doctor and appraiser confirm that this record is a fair and accurate account of the appraisal discussion and that the supporting information presented reflects the doctor's work across the appraisal period. Supporting information has been considered in line with the GMC's appraisal and revalidation requirements.",
    { font: italic, color: NHS.darkGrey, size: SMALL_SIZE },
  );
  y -= 6;
  body(
    `Generated by ${BRAND_NAME} on ${new Date().toISOString().slice(0, 10)} · Signed signatures are recorded in the Signatures section above.`,
    { size: 7.5, color: NHS.midGrey },
  );

  // ── Footers on every page ──────────────────────────────────────────────
  pages.forEach((p, i) => {
    p.drawRectangle({ x: 0, y: 40, width: PAGE_W, height: 0.75, color: rgbOf(NHS.borderGrey) });
    p.drawText(FOOTER_NOTE, { x: MARGIN_LEFT, y: 29, size: 7, font: reg, color: rgbOf(NHS.midGrey) });
    const label = `Page ${i + 1} of ${pages.length}`;
    p.drawText(label, {
      x: PAGE_W - MARGIN_RIGHT - reg.widthOfTextAtSize(label, 7),
      y: 29,
      size: 7,
      font: reg,
      color: rgbOf(NHS.midGrey),
    });
    p.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: 3, color: rgbOf(NHS.blue) });
  });

  return doc.save();
}

// ── flattenSectionData (unchanged contract) ──────────────────────────────
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
