"use client";

import { useEffect, useMemo, useRef } from "react";
import dayjs from "dayjs";
import DOMPurify from "isomorphic-dompurify";

export interface IPrintXrayReportData {
  sessionId?: string;
  mrd?: string;
  patientName?: string;
  age?: string;
  gender?: string;
  procedureName?: string;
  department?: string;
  tokenDate?: string;
  reportHtml?: string;
}

interface IPrintXrayReportProps {
  reportData: IPrintXrayReportData;
  onClose?: () => void;
}

const formatAgeForPrint = (
  years?: number | null,
  months?: number | null,
  days?: number | null
): string | undefined => {
  const y = years != null ? Number(years) : undefined;
  if (y != null && Number.isFinite(y)) {
    if (y === 0) {
      const m = months != null ? Number(months) : 0;
      if (m > 0) return `${m} ${m === 1 ? "Month" : "Months"}`;
      if (days != null) return `${days} ${Number(days) === 1 ? "Day" : "Days"}`;
      return undefined;
    }
    return `${y} ${y === 1 ? "Year" : "Years"}`;
  }
  const m = months != null ? Number(months) : 0;
  if (m > 0) return `${m} ${m === 1 ? "Month" : "Months"}`;
  if (days != null) return `${days} ${Number(days) === 1 ? "Day" : "Days"}`;
  return undefined;
};

const formatPrintDate = (value?: string | null) => {
  if (!value?.trim()) return "—";
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("DD MMM YYYY") : "—";
};

export const buildPrintXrayReportData = (session: {
  sessionId?: string;
  tokenDate?: string;
  reportHtml?: string;
  patient?: {
    name?: string;
    mrd?: string;
    age?: number;
    months?: number;
    days?: number;
    gender?: string;
  };
  procedure?: {
    procedureName?: string;
    department?: string;
  };
}): IPrintXrayReportData => ({
  sessionId: session.sessionId,
  mrd: session.patient?.mrd,
  patientName: session.patient?.name,
  age: formatAgeForPrint(session.patient?.age, session.patient?.months, session.patient?.days),
  gender: session.patient?.gender,
  procedureName: session.procedure?.procedureName,
  department: session.procedure?.department,
  tokenDate: session.tokenDate,
  reportHtml: session.reportHtml,
});

const PrintXrayReport = ({ reportData, onClose }: IPrintXrayReportProps) => {
  const printRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const printEffectKey = useMemo(
    () =>
      [reportData.sessionId ?? "", reportData.reportHtml ?? "", reportData.tokenDate ?? ""].join(
        "|"
      ),
    [reportData.sessionId, reportData.reportHtml, reportData.tokenDate]
  );

  useEffect(() => {
    let cancelled = false;

    const doPrint = () => {
      if (!printRef.current || cancelled) return;
      const iframe = document.createElement("iframe");
      iframe.setAttribute("title", "X-ray report print");
      iframe.style.cssText =
        "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;";
      document.body.appendChild(iframe);
      const iframeDoc = iframe.contentDocument ?? iframe.contentWindow?.document;
      const iframeWin = iframe.contentWindow;
      if (!iframeDoc || !iframeWin) {
        iframe.remove();
        return;
      }
      if (cancelled) return;

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>X-Ray Report - ${reportData.sessionId || "Xray"}</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                margin: 0;
                padding: 2px 14px;
                font-family: Tahoma, Arial, sans-serif;
                font-size: 16px;
                color: #000;
                background: #fff;
                line-height: 1.4;
              }
              .receipt-container { width: 100%; max-width: 100%; margin: 0 auto; padding: 0 12px; background: #fff; }
              .header-spacer {
                min-height: 70px;
                margin-bottom: 10px;
                padding-bottom: 8px;
              }
              .content-box { border: none; padding: 8px 12px 0 12px; margin-bottom: 12px; }
              .patient-details-box { margin-bottom: 10px; padding-bottom: 8px; }
              .patient-info-table { width: 100%; border-collapse: collapse; font-size: 15px; table-layout: fixed; }
              .patient-info-table td { border: 1px solid #000; padding: 4px 8px; vertical-align: middle; }
              .info-label-cell { background-color: #f8f9fa; font-weight: 600; white-space: nowrap; width: 18%; }
              .info-value-cell { background-color: #ffffff; font-weight: 500; width: 40%; }
              .info-value-cell-narrow { width: 24%; }
              .section { margin-bottom: 12px; }
              .section-title {
                font-size: 14px;
                font-weight: bold;
                border-bottom: 1px solid #000;
                padding-bottom: 3px;
                margin-bottom: 8px;
              }
              .xray-report-title {
                text-align: center;
                font-size: 16px;
                font-weight: bold;
                margin-bottom: 10px;
                padding-bottom: 4px;
                border-bottom: 1px solid #000;
              }
              .xray-report-html {
                font-size: 15px;
                font-weight: 500;
                color: #000;
                word-break: break-word;
                line-height: 1.55;
                overflow: visible;
              }
              .xray-report-html * { color: #000 !important; }
              .xray-report-html p { margin: 0.5em 0; }
              .xray-report-html ol,
              .xray-report-html ul {
                margin: 0.5em 0;
                padding-left: 2em;
              }
              .xray-report-html li {
                margin-bottom: 0.35em;
                padding-left: 0.25em;
              }
              .xray-report-html blockquote {
                margin: 0.5em 0;
                padding-left: 1em;
                border-left: 2px solid #ccc;
              }
              .xray-report-html strong, .xray-report-html b { font-weight: bold; }
              .xray-report-html em, .xray-report-html i { font-style: italic; }
              .xray-report-html u { text-decoration: underline; }
              .report-end {
                margin-top: 24px;
                padding-top: 8px;
                border-top: 1px solid #000;
                text-align: center;
                font-size: 13px;
                font-weight: 600;
                color: #000;
              }
              @media print {
                @page { margin: 12mm 12mm 12mm 14mm; size: A4; }
                body { padding: 0; background: white !important; }
                .receipt-container { max-width: none; width: 100%; padding: 0; }
                .content-box { padding-left: 0; padding-right: 0; }
              }
            </style>
          </head>
          <body>
            ${printRef.current.innerHTML}
          </body>
        </html>
      `;

      iframeDoc.open();
      iframeDoc.write(html);
      iframeDoc.close();

      const finish = () => {
        if (cancelled) return;
        try {
          iframeWin.focus();
          iframeWin.print();
        } finally {
          window.setTimeout(() => {
            if (cancelled) return;
            iframe.remove();
            onCloseRef.current?.();
          }, 250);
        }
      };

      window.setTimeout(finish, 250);
    };

    doPrint();

    return () => {
      cancelled = true;
    };
  }, [printEffectKey, reportData.sessionId]);

  const patientName = reportData.patientName?.trim() || "—";
  const patientAge =
    reportData.age != null && String(reportData.age).trim() !== "" ? String(reportData.age) : "—";
  const patientGender = reportData.gender?.trim() || "—";
  const patientAgeGender = patientGender !== "—" ? `${patientAge} / ${patientGender}` : patientAge;
  const procedureLine = [reportData.procedureName, reportData.department]
    .filter((v) => v?.trim())
    .join(" · ");
  const xrayReportTitle = reportData.procedureName?.trim()
    ? `Xray of ${reportData.procedureName.trim()}`
    : "Xray Report";

  return (
    <div style={{ display: "none" }}>
      <div ref={printRef} className="receipt-container">
        <div className="header-spacer" aria-hidden="true" />

        <div className="content-box">
          <div className="patient-details-box">
            <table className="patient-info-table">
              <tbody>
                <tr>
                  <td className="info-label-cell">MRD No.:</td>
                  <td className="info-value-cell">{reportData.mrd ?? "—"}</td>
                  <td className="info-label-cell">Session ID:</td>
                  <td className="info-value-cell info-value-cell-narrow">
                    {reportData.sessionId ?? "—"}
                  </td>
                </tr>
                <tr>
                  <td className="info-label-cell">Patient Name:</td>
                  <td className="info-value-cell">{patientName}</td>
                  <td className="info-label-cell">Age / Gender:</td>
                  <td className="info-value-cell info-value-cell-narrow">{patientAgeGender}</td>
                </tr>
                <tr>
                  <td className="info-label-cell">Procedure:</td>
                  <td className="info-value-cell">{procedureLine || "—"}</td>
                  <td className="info-label-cell">Date:</td>
                  <td className="info-value-cell info-value-cell-narrow">
                    {formatPrintDate(reportData.tokenDate)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="section">
            <div className="xray-report-title">{xrayReportTitle}</div>
            <div
              className="xray-report-html"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(reportData.reportHtml ?? "") }}
            />
          </div>

          <div className="report-end">— End of report —</div>
        </div>
      </div>
    </div>
  );
};

export default PrintXrayReport;
