/**
 * Opens a minimal print window sized for common thermal receipt printers (~80mm).
 * Uses monospace text and @page size hints; actual width depends on browser/OS print driver.
 */

import { formatTokenWithVisitPrefix } from "@/core/utils/tokenPrefix";

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export interface IThermalTokenPayload {
  hospitalName?: string;
  caseId: string;
  tokenNo: string | number;
  visitType?: string;
  tokenTitle?: string;
  useVisitPrefix?: boolean;
  paperWidthMm?: number;
  slipWidthMm?: number;
  patientName: string;
  appointmentDateTime: string;
  doctorName?: string;
}

export const openThermalTokenPrint = (p: IThermalTokenPayload): void => {
  const hospital = p.hospitalName?.trim() || "JJM Hospital";
  const w = window.open("", "_blank", "width=360,height=640,scrollbars=yes");
  if (!w) {
    alert("Please allow pop-ups to print the token.");
    return;
  }

  const tokenTitle = p.tokenTitle?.trim() || "OPD Token";
  const useVisitPrefix = p.useVisitPrefix ?? true;
  const formattedToken = useVisitPrefix
    ? formatTokenWithVisitPrefix(p.tokenNo, p.visitType)
    : String(p.tokenNo ?? "").trim() || "N/A";
  const tokenStr = escapeHtml(formattedToken);
  const apptRaw = (p.appointmentDateTime ?? "").trim();
  const apptParts = apptRaw.split(" - ").map((s) => s.trim()).filter(Boolean);
  const apptDateLine = apptParts[0] ? escapeHtml(apptParts[0]) : "";
  const paperWidthMm =
    typeof p.paperWidthMm === "number" && p.paperWidthMm > 0 ? p.paperWidthMm : 80;
  const slipWidthMm =
    typeof p.slipWidthMm === "number" && p.slipWidthMm > 0
      ? Math.min(p.slipWidthMm, paperWidthMm)
      : 72;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Token ${tokenStr}</title>
<style>
  @page {
    size: ${paperWidthMm}mm auto;
    margin: 0;
  }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    background: #fff;
    color: #000;
  }
  .slip {
    max-width: ${slipWidthMm}mm;
    margin: 0 auto;
    padding: 0 4mm 0;
    font-family: ui-monospace, "Cascadia Code", "Courier New", Courier, monospace;
    font-size: 12px;
    line-height: 1.4;
  }
  .head {
    text-align: center;
    font-weight: 700;
    font-size: 13px;
    margin-bottom: 2px;
  }
  .sub-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    font-size: 11px;
    margin-bottom: 6px;
    width: 100%;
  }
  .sub-row--split {
    justify-content: space-between;
  }
  .sub-row:not(.sub-row--split) {
    justify-content: center;
  }
  .sub-title {
    flex-shrink: 0;
  }
  .sub-date {
    flex-shrink: 0;
    text-align: right;
  }
  .rule {
    border: none;
    border-top: 1px dashed #000;
    margin: 6px 0;
  }
  .token {
    text-align: center;
    font-size: 35px;
    font-weight: 700;
    letter-spacing: 0.06em;
    line-height: 1.1;
    margin: 4px 0 2px;
  }
  .token-lbl {
    text-align: center;
    font-size: 11px;
    text-transform: uppercase;
    margin-bottom: 4px;
  }
  .actions {
    margin-top: 12px;
    text-align: center;
  }
  .actions button {
    font-size: 13px;
    padding: 6px 14px;
    cursor: pointer;
  }
</style>
</head>
<body>
  <div class="slip">
    <div class="head">${escapeHtml(hospital)}</div>
    <div class="sub-row${apptDateLine ? " sub-row--split" : ""}">
      <span class="sub-title">${escapeHtml(tokenTitle)}</span>
      ${apptDateLine ? `<span class="sub-date">${apptDateLine}</span>` : ""}
    </div>
    <hr class="rule"/>
    <div class="token">${tokenStr}</div>
    <div class="token-lbl">Token No.</div>
    <hr class="rule"/>
    <div class="actions no-print">
      <button type="button" id="btn-print">Print</button>
    </div>
  </div>
  <script>
    (function () {
      function doPrint() {
        window.focus();
        window.print();
      }
      var btn = document.getElementById("btn-print");
      if (btn) btn.addEventListener("click", doPrint);
      setTimeout(doPrint, 200);
    })();
  </script>
</body>
</html>`;

  w.document.open();
  w.document.write(html);
  w.document.close();
};
