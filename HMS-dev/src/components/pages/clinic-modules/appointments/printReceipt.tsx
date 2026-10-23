"use client";

import { useEffect, useMemo, useRef } from "react";
import dayjs from "dayjs";

export interface IPathlabTestItem {
  srNo: number;
  testName: string;
  price: number;
}

export interface IPathlabReceiptData {
  caseId: string;
  patientName?: string;
  patientTitle?: string;
  mrd?: string;
  age?: string;
  gender?: string;
  address?: string;
  referringDoctorName?: string;
  date?: string;
  tests: IPathlabTestItem[];
  totalAmount: number;
  discountValue: number;
  finalAmount: number;
  paidAmount: number;
}

export interface IReceiptTransaction {
  _id: string;
  transactionId: string;
  transactionType?: string;
  amount: number;
  paymentMode: string;
  referenceNo?: string;
  transactionDate: string;
  createdAt?: string;
}

export interface IBillingLineItem {
  srNo: number;
  description: string;
  units: number;
  rate: number;
  amount: number;
}

export interface IReceiptData {
  visitId?: string;
  appointmentId?: string;
  visitDate?: string;
  visitTime?: string;
  tokenNumber?: number;
  visitType?: string;
  appointmentType?: string;
  status?: string;
  patientName?: string;
  patientTitle?: string;
  mrd?: string;
  age?: string | number;
  gender?: string;
  phone?: string;
  address?: string;
  doctorId?: string;
  doctorName?: string;
  doctorDepartment?: string;
  /** Shown in square brackets after doctor name on print */
  medicalLicenseNo?: string;
  receiptId?: string;
  printTitle?: string;
  /** Shown after "Discount by" on the Discount line when a discount is applied (e.g. IPD Final Bill). */
  discountAuthorizedBy?: string;
  transactions?: IReceiptTransaction[];
  /** IPD Final Bill: itemized charges table (S. No., Description, Unit, Rate, Amount). */
  billingLineItems?: IBillingLineItem[];
  totalAmount?: number;
  discount?: number;
  dueAmount?: number;
  paidAmount?: number;
}

interface IPrintReceiptProps {
  receiptData: IReceiptData;
  pathlabReceiptData?: IPathlabReceiptData[];
  onClose?: () => void;
}

const PrintReceipt = ({ receiptData, pathlabReceiptData, onClose }: IPrintReceiptProps) => {
  const printRef = useRef<HTMLDivElement>(null);
  /** Inline parent handlers change every render; must not be a useEffect dependency or print runs again after cancel. */
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  /** Parents often pass `buildDaycareReceiptData(...)` inline — new object every render would retrigger print. */
  const receiptEffectKey = useMemo(
    () =>
      [
        receiptData.visitId ?? "",
        receiptData.appointmentId ?? "",
        receiptData.receiptId ?? "",
        String(receiptData.totalAmount ?? ""),
        String(receiptData.discount ?? ""),
        String(receiptData.paidAmount ?? ""),
      ].join("|"),
    [
      receiptData.visitId,
      receiptData.appointmentId,
      receiptData.receiptId,
      receiptData.totalAmount,
      receiptData.discount,
      receiptData.paidAmount,
    ]
  );

  useEffect(() => {
    let cancelled = false;

    const doPrint = () => {
      if (!printRef.current || cancelled) return;
      const iframe = document.createElement("iframe");
      iframe.setAttribute("title", "Receipt print");
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
            <title>${receiptData.printTitle ?? "Receipt"} - ${receiptData.visitId || "Visit"}</title>
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
              .receipt-container { width: 100%; max-width: 600px; margin: 0 auto; padding: 0 60px; background: #fff; }
              .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 2px solid #000; gap: 12px; }
              .header-left { display: flex; align-items: center; gap: 10px; }
              .header-center { flex: 1; display: flex; align-items: center; justify-content: center; min-height: 54px; }
              .header-center .receipt-title { transform: translateX(18px); }
              .logo-img { width: 54px; height: 54px; object-fit: contain; flex-shrink: 0; }
              .header-info h2 { font-size: 20px; font-weight: bold; margin: 0 0 2px 0; color: #000; }
              .header-info .certification { font-size: 12px; color: #000; margin-top: 2px; }
              .header-right { text-align: right; }
              .header-right .address { font-size: 14px; color: #000; margin-bottom: 4px; line-height: 1.4; }
              .header-right .contact { font-size: 14px; color: #000; line-height: 1.6; }
              .receipt-title {
                text-align: center;
                font-size: 20px;
                font-weight: bold;
                letter-spacing: 0.04em;
                color: #000;
              }
              .content-box { border: none; padding: 8px 12px 0 12px; margin-bottom: 12px; }
              .patient-details-box { margin-bottom: 10px; padding-bottom: 8px; }
              .patient-info-table { width: 100%; border-collapse: collapse; font-size: 15px; table-layout: fixed; }
              .patient-info-table td { border: 1px solid #000; padding: 4px 8px; vertical-align: middle; }
              .info-label-cell { background-color: #f8f9fa; font-weight: 600; white-space: nowrap; width: 18%; }
              .info-value-cell { background-color: #ffffff; font-weight: 500; width: 40%; }
              .info-value-cell-narrow { width: 24%; }
              .transactions-section { margin-bottom: 0; }
              .transaction-header { display: flex; padding: 8px 0; border-bottom: 2px solid #000; font-weight: bold; font-size: 15px; }
              .transaction-header .col-type { width: 75%; }
              .transaction-header .col-rate { width: 25%; text-align: right; }
              .transaction-row { display: flex; padding: 8px 0; border-bottom: 1px solid #000; font-size: 15px; font-weight: 600; }
              .transaction-row .col-type { width: 75%; }
              .transaction-row .col-rate { width: 25%; text-align: right; }
              .receipt-container-wide { max-width: 100%; padding: 0 12px; }
              .billing-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 13px;
                table-layout: fixed;
              }
              .billing-table th,
              .billing-table td {
                border: 1px solid #000;
                padding: 4px 6px;
                vertical-align: top;
              }
              .billing-table th {
                font-weight: bold;
                text-align: center;
                font-size: 13px;
              }
              .billing-table .col-sno { width: 7%; text-align: center; }
              .billing-table .col-desc { width: 51%; text-align: left; font-weight: 600; }
              .billing-table .col-unit { width: 7%; text-align: right; }
              .billing-table .col-rate { width: 17%; text-align: right; }
              .billing-table .col-amount { width: 18%; text-align: right; }
              .billing-total-row td {
                font-weight: bold;
                font-size: 13px;
              }
              .billing-total-label { text-align: right; }
              .billing-total-colon { text-align: center; }
              .summary-section { margin-top: 10px; }
              .summary-section-billing .summary-row {
                font-size: 13px;
                padding: 5px 0;
              }
              .summary-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 16px; font-weight: 600; border-bottom: 1px solid #000; }
              .summary-row.total-paid { font-weight: bold; border-bottom: none; margin-top: 0; padding-bottom: 8px; }
              .footer { margin-top: 10px; display: flex; justify-content: space-between; font-size: 11px; color: #000; }
              .signature-block {
                min-width: 180px;
                text-align: center;
              }
              .signature-line {
                border-top: 1px solid #000;
                margin-top: 50px;
                padding-top: 4px;
                font-size: 11px;
                font-weight: 600;
                text-align: center;
              }
              .payment-no-data { text-align: center; padding: 24px; color: #000; font-size: 14px; border: 1px solid #000; }
              .pathlab-page { page-break-before: always; padding-top: 10px; }
              .test-section { margin-bottom: 0; }
              .test-header { display: flex; padding: 8px 0; border-bottom: 2px solid #000; font-weight: bold; font-size: 15px; }
              .test-header .col-sr { width: 10%; }
              .test-header .col-name { width: 65%; }
              .test-header .col-rate { width: 25%; text-align: right; }
              .test-row { display: flex; padding: 8px 0; border-bottom: 1px solid #000; font-size: 15px; }
              .test-row .col-sr { width: 10%; }
              .test-row .col-name { width: 65%; font-weight: 600; }
              .test-row .col-rate { width: 25%; text-align: right; font-weight: 600; }
              .summary-row-light { display: flex; justify-content: space-between; padding: 8px 0; font-size: 16px; border-bottom: 1px solid #000; }
              @media print {
                @page { margin: 8mm 10mm 10mm 10mm; size: A4; }
                body { padding: 0; background: white !important; }
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
    // Intentionally omit onClose and receipt object identity — use receiptEffectKey + onCloseRef instead.
  }, [receiptEffectKey]);

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return "—";
    const parts = timeStr.split(":");
    const h = parseInt(parts[0], 10);
    const m = parts[1] || "00";
    const ampm = h >= 12 ? "PM" : "AM";
    const hour = h % 12 || 12;
    return `${hour}:${m} ${ampm}`;
  };

  const patientName = [receiptData.patientTitle, receiptData.patientName].filter(Boolean).join(" ").trim() || "—";
  const patientAge = receiptData.age != null && String(receiptData.age).trim() !== "" ? String(receiptData.age) : "—";
  const patientGender = receiptData.gender?.trim() || "—";
  const patientAgeGender = patientGender !== "—" ? `${patientAge} / ${patientGender}` : patientAge;
  const patientAddress = receiptData.address?.trim() || "—";
  const rawDoctorName = receiptData.doctorName?.trim() || "";
  const licenseNo = receiptData.medicalLicenseNo?.trim();
  const doctorLineForPrint =
    rawDoctorName !== ""
      ? (() => {
          const withoutDupDr = rawDoctorName.replace(/^Dr\.\s*/i, "").trim();
          const withTitle = `Dr. ${withoutDupDr}`;
          return licenseNo ? `${withTitle} [${licenseNo}]` : withTitle;
        })()
      : "—";
  const visitDate = receiptData.visitDate ? dayjs(receiptData.visitDate).format("DD MMM YYYY") : "—";
  const visitTime = receiptData.visitTime ? formatTime(receiptData.visitTime) : "—";
  const transactions = receiptData.transactions ?? [];
  const billingLineItems = receiptData.billingLineItems ?? [];
  const useBillingTable = billingLineItems.length > 0;
  const formatBillNumber = (value: number) =>
    Number.isFinite(value) ? value.toFixed(2) : "0.00";
  // Treat totalAmount as the gross/subtotal before discount when provided
  const totalAmount =
    receiptData.totalAmount ??
    transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const discount = receiptData.discount ?? 0;
  const discountAuthorizedBy = receiptData.discountAuthorizedBy?.trim();
  const discountLabel =
    discount > 0 && discountAuthorizedBy
      ? `Discount by ${discountAuthorizedBy}`
      : "Discount";
  const finalAmount = totalAmount - discount;
  const totalPaid =
    receiptData.paidAmount != null
      ? Number(receiptData.paidAmount) || 0
      : transactions.reduce((sum, t) => sum + (t.amount || 0), 0);

  // Use absolute URL for logo so it renders in print window
  const logoUrl =
    typeof window !== "undefined"
      ? new URL(encodeURI("/JJM Logo.png"), window.location.origin).href
      : encodeURI("/JJM Logo.png");

  return (
    <div style={{ display: "none" }}>
      <div
        ref={printRef}
        className={`receipt-container${useBillingTable ? " receipt-container-wide" : ""}`}
      >
        {/* Header */}
        <div className="header">
          <div className="header-left">
            <img src={logoUrl} alt="JJM Hospital" className="logo-img" />
            <div className="header-info">
              <h2>JJM Hospital</h2>
              <div className="certification">ISO 9001:2000 Certified</div>
            </div>
          </div>
          <div className="header-center">
            <div className="receipt-title">{receiptData.printTitle ?? "Receipt"}</div>
          </div>
          <div className="header-right">
            <div className="address">
              Jaspur Rd, opposite Anaj Mandi, Sarverkhera,<br />
              Kashipur, Uttarakhand 244713
            </div>
            <div className="contact">
              Phone: +91 9634844075<br />
            </div>
          </div>
        </div>

        {/* Content Box */}
        <div className="content-box">
          {/* Patient Details */}
          <div className="patient-details-box">
            <table className="patient-info-table">
              <tbody>
                <tr>
                  <td className="info-label-cell">MRD No.:</td>
                  <td className="info-value-cell">{receiptData.mrd ?? "—"}</td>
                  <td className="info-label-cell">Date:</td>
                  <td className="info-value-cell info-value-cell-narrow">{visitDate}</td>
                </tr>
                <tr>
                  <td className="info-label-cell">Patient Name:</td>
                  <td className="info-value-cell">{patientName}</td>
                  <td className="info-label-cell">Case/Rec. No.:</td>
                  <td className="info-value-cell info-value-cell-narrow">{receiptData.visitId ?? "—"}</td>
                </tr>
                <tr>
                  <td className="info-label-cell">Address:</td>
                  <td className="info-value-cell">{patientAddress}</td>
                  <td className="info-label-cell">Age / Gender:</td>
                  <td className="info-value-cell info-value-cell-narrow">{patientAgeGender}</td>
                </tr>
                <tr>
                  <td className="info-label-cell">Doctor Name:</td>
                  <td className="info-value-cell" colSpan={3}>
                    {doctorLineForPrint}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Charges Section */}
          {useBillingTable ? (
            <div className="transactions-section">
              <table className="billing-table">
                <thead>
                  <tr>
                    <th className="col-sno">S. No.</th>
                    <th className="col-desc">Description</th>
                    <th className="col-unit">Unit</th>
                    <th className="col-rate">Rate</th>
                    <th className="col-amount">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {billingLineItems.map((item) => (
                    <tr key={item.srNo}>
                      <td className="col-sno">{item.srNo}</td>
                      <td className="col-desc">{item.description}</td>
                      <td className="col-unit">{formatBillNumber(item.units)}</td>
                      <td className="col-rate">{formatBillNumber(item.rate)}</td>
                      <td className="col-amount">{formatBillNumber(item.amount)}</td>
                    </tr>
                  ))}
                  <tr className="billing-total-row">
                    <td className="col-sno" />
                    <td className="col-desc billing-total-label" colSpan={2}>
                      Total
                    </td>
                    <td className="col-rate billing-total-colon">:</td>
                    <td className="col-amount">{formatBillNumber(totalAmount)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="transactions-section">
              <div className="transaction-header">
                <div className="col-type">Type</div>
                <div className="col-rate">Amount</div>
              </div>
              {transactions.length === 0 ? (
                <div className="payment-no-data">No Entries Found</div>
              ) : (
                transactions.map((txn) => (
                  <div key={txn._id} className="transaction-row">
                    <div className="col-type">
                      {txn.transactionType
                        ? txn.transactionType
                        : `${receiptData.appointmentType ?? "—"}${
                            receiptData.visitType ? ` (${receiptData.visitType})` : ""
                          }`}
                    </div>
                    <div className="col-rate">
                      ₹{typeof txn.amount === "number" ? txn.amount.toFixed(2) : "0.00"}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Summary Section */}
          <div className={`summary-section${useBillingTable ? " summary-section-billing" : ""}`}>
            {!useBillingTable && (
              <div className="summary-row">
                <span>Total:</span>
                <span>₹{totalAmount.toFixed(2)}</span>
              </div>
            )}
            {discount > 0 && (
              <>
                <div className="summary-row">
                  <span>{discountLabel}:</span>
                  <span>₹{discount.toFixed(2)}</span>
                </div>
                <div className="summary-row">
                  <span>Final Amount:</span>
                  <span>₹{finalAmount.toFixed(2)}</span>
                </div>
              </>
            )}
            <div className="summary-row total-paid">
              <span> Paid Amount:</span>
              <span>₹{totalPaid.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="footer">
          <div>This is a computer generated receipt.</div>
          <div className="signature-block">
            <div className="signature-line">Signature</div>
          </div>
        </div>

        {/* Pathlab Receipt Pages — must be inside printRef so innerHTML captures them */}
        {pathlabReceiptData && pathlabReceiptData.length > 0
        ? pathlabReceiptData.map((pl) => {
            const plPatientName = [pl.patientTitle, pl.patientName].filter(Boolean).join(" ").trim() || "—";
            const plAgeGender = pl.gender
              ? `${pl.age ?? "—"} / ${pl.gender}`
              : (pl.age ?? "—");
            const plDate = pl.date ? dayjs(pl.date).format("DD MMM YYYY") : "—";
            return (
              <div key={pl.caseId} className="pathlab-page">
                {/* Header */}
                <div className="header">
                  <div className="header-left">
                    <img src={logoUrl} alt="JJM Hospital" className="logo-img" />
                    <div className="header-info">
                      <h2>JJM Hospital</h2>
                      <div className="certification">ISO 9001:2000 Certified</div>
                    </div>
                  </div>
                  <div className="header-center">
                    <div className="receipt-title">Pathlab Receipt</div>
                  </div>
                  <div className="header-right">
                    <div className="address">
                      Jaspur Rd, opposite Anaj Mandi, Sarverkhera,<br />
                      Kashipur, Uttarakhand 244713
                    </div>
                    <div className="contact">Phone: +91 9634844075</div>
                  </div>
                </div>

                {/* Content */}
                <div className="content-box">
                  {/* Patient Details */}
                  <div className="patient-details-box">
                    <table className="patient-info-table">
                      <tbody>
                        <tr>
                          <td className="info-label-cell">MRD No.:</td>
                          <td className="info-value-cell">{pl.mrd ?? "—"}</td>
                          <td className="info-label-cell">Date:</td>
                          <td className="info-value-cell info-value-cell-narrow">{plDate}</td>
                        </tr>
                        <tr>
                          <td className="info-label-cell">Patient Name:</td>
                          <td className="info-value-cell">{plPatientName}</td>
                          <td className="info-label-cell">Case/Rec. No.:</td>
                          <td className="info-value-cell info-value-cell-narrow">{pl.caseId}</td>
                        </tr>
                        <tr>
                          <td className="info-label-cell">Address:</td>
                          <td className="info-value-cell">{pl.address?.trim() || "—"}</td>
                          <td className="info-label-cell">Age / Gender:</td>
                          <td className="info-value-cell info-value-cell-narrow">{plAgeGender}</td>
                        </tr>
                        <tr>
                          <td className="info-label-cell">Ref. Doctor:</td>
                          <td className="info-value-cell" colSpan={3}>{pl.referringDoctorName?.trim() || "—"}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Tests */}
                  <div className="test-section">
                    <div className="test-header">
                      <div className="col-sr">SR No.</div>
                      <div className="col-name">Test Name</div>
                      <div className="col-rate">Rate</div>
                    </div>
                    {pl.tests.length === 0 ? (
                      <div className="payment-no-data">No Tests Found</div>
                    ) : (
                      pl.tests.map((test) => (
                        <div key={test.srNo} className="test-row">
                          <div className="col-sr">{test.srNo}</div>
                          <div className="col-name">{test.testName}</div>
                          <div className="col-rate">₹{test.price.toFixed(2)}</div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Summary */}
                  <div className="summary-section">
                    <div className="summary-row">
                      <span>Total</span>
                      <span>₹{pl.totalAmount.toFixed(2)}</span>
                    </div>
                    <div className="summary-row-light">
                      <span>Discount</span>
                      <span>₹{pl.discountValue.toFixed(2)}</span>
                    </div>
                    <div className="summary-row">
                      <span>Final Amount</span>
                      <span>₹{pl.finalAmount.toFixed(2)}</span>
                    </div>
                    <div className="summary-row total-paid">
                      <span>Total Paid Amount</span>
                      <span>₹{pl.paidAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="footer">
                  <div>This is a computer generated receipt.</div>
                  <div className="signature-block">
                    <div className="signature-line">Signature</div>
                  </div>
                </div>
              </div>
            );
          })
        : null}
      </div>
    </div>
  );
};

export default PrintReceipt;
