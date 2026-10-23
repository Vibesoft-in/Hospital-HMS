"use client";

import { useEffect, useRef } from "react";

interface IPrintPrescriptionProps {
  appointmentData: {
    Case_ID?: string;
    Date_Time?: string;
    Patient?: string;
    Phone?: string;
    Doctor?: string;
    role?: string;
    _department?: string;
    _visitDate?: string;
    _visitTime?: string;
    Visit?: string;
    Appointment_Type?: string;
    UHD_No?: string;
    Guardian_Name?: string;
    Age?: string;
    Sex?: string;
    Address?: string;
    Token_No?: string | number;
    MRD_No?: string;
    OPD_No?: string;
    Amount?: string;
    Organisation_name?: string;
    Valid_Upto?: string;
    Vitals?: {
      HT?: string;
      WT?: string;
      BP?: string;
      PR?: string;
      RBS?: string;
    };
    Chief_Complaints?: string;
    O_E?: string;
    Comorbidities?: {
      DM_HTN_Thyroid?: boolean;
      Smoking_Alcohol_TB?: boolean;
    };
    Menstrual_History?: string;
    Prev_Surgeries?: string;
    Prov_Diagnosis?: string;
    Treatment_Advice?: string;
    Investigation_Advice?: string;
  };
  onClose?: () => void;
}

const PrintPrescription = ({ appointmentData, onClose }: IPrintPrescriptionProps) => {
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePrint = () => {
      if (printRef.current) {
        const printWindow = window.open("", "_blank");
        if (printWindow) {
          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Appointment - Patient Details</title>
                <style>
                  * { margin: 0; padding: 0; box-sizing: border-box; }
                  body {
                    margin: 0;
                    padding: 14px;
                    font-family: Tahoma, Arial, sans-serif;
                    font-size: 13px;
                    color: #000;
                    background: #fff;
                    line-height: 1.4;
                  }
                  .prescription-container {
                    width: 100%;
                    max-width: 900px;
                    margin: 0 auto;
                    padding: 0;
                    background: #fff;
                  }
                  .vitals-layout {
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                    justify-content: flex-end;
                    padding-left: 8px;
                    padding-right: 8px;
                    margin-bottom: 12px;
                  }
                  .vitals-main {
                    flex: 0 0 40%;
                    max-width: 40%;
                    min-width: 0;
                    margin-left: auto;
                  }
                  .vitals-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 12px;
                    line-height: 1.3;
                    margin: 0;
                  }
                  .vitals-table td {
                    padding: 4px 6px;
                    border: 1px solid #000;
                    vertical-align: middle;
                  }
                  .vitals-table th {
                    padding: 4px 6px;
                    border: 1px solid #000;
                    vertical-align: middle;
                    background-color: #f8f9fa;
                    font-weight: 600;
                    text-align: center;
                  }
                  .vitals-label-cell {
                    background-color: #f8f9fa;
                    font-weight: 600;
                    color: #000;
                    width: 35%;
                    white-space: nowrap;
                  }
                  .vitals-value-cell {
                    background-color: #ffffff;
                    font-weight: 500;
                    color: #000;
                    width: 32.5%;
                  }
                  .vitals-value-cell-empty {
                    background-color: #ffffff;
                    width: 32.5%;
                  }
                  .letterhead-space { height: 60px; width: 100%; margin-bottom: 12px; }
                  .patient-card {
                    border-radius: 12px;
                    padding: 6px 8px;
                    margin-bottom: 12px;
                  }
                  .patient-info-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 13px;
                    line-height: 1.3;
                    margin: 0;
                  }
                  .patient-info-table td {
                    padding: 4px 6px;
                    border: 1px solid #000;
                    vertical-align: middle;
                    font-size: 12px;
                  }
                  .info-label-cell {
                    background-color: #f8f9fa;
                    font-weight: 600;
                    color: #000;
                    width: 20%;
                    text-align: left;
                    white-space: nowrap;
                  }
                  .info-value-cell {
                    background-color: #ffffff;
                    font-weight: 500;
                    color: #000;
                    width: 30%;
                    text-align: left;
                  }
                  .info-value-cell-full {
                    background-color: #ffffff;
                    font-weight: 500;
                    color: #000;
                    text-align: left;
                  }
                  @media print {
                    @page { margin: 12mm; size: A4; }
                    body { padding: 0; background: white !important; }
                    .patient-info-table td { border: 1px solid #000 !important; font-size: 12px !important; }
                    .patient-info-table { page-break-inside: avoid; }
                  }
                </style>
              </head>
              <body>
                ${printRef.current.innerHTML}
              </body>
            </html>
          `);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => {
            printWindow.print();
            printWindow.close();
            if (onClose) {
              onClose();
            }
          }, 250);
        }
      }
    };

    handlePrint();
  }, [onClose]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const formatDateTime = (dateTimeString?: string) => {
    if (!dateTimeString) return "";
    return dateTimeString;
  };

  const getBaseDate = () => {
    if (!appointmentData.Date_Time) return null;

    // Original Date cell was based on the first part before " - "
    const raw = formatDateTime(appointmentData.Date_Time);
    const firstPart = raw.split(" - ")[0] || "";
    if (!firstPart) return null;

    const d = new Date(firstPart);
    if (Number.isNaN(d.getTime())) return null;
    return d;
  };

  const baseDate = getBaseDate();

  const displayDate =
    baseDate?.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    }) || "";

  const validUpto =
    baseDate &&
    (() => {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + 6);
      return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      });
    })() ||
    "";

  const normalizeVital = (value?: string) => {
    const v = value?.trim();
    if (!v) return "";
    if (v === "-" || v === "—") return "";
    return v;
  };

  const bpValue = normalizeVital(appointmentData.Vitals?.BP);
  const pulseValue = normalizeVital(appointmentData.Vitals?.PR);
  const weightValue = normalizeVital(appointmentData.Vitals?.WT);
  const spO2Value = normalizeVital(appointmentData.Vitals?.HT);

  return (
    <div style={{ display: "none" }}>
      <div ref={printRef} className="prescription-container">
        {/* Letterhead Space */}
        <div className="letterhead-space"></div>

        {/* Patient Details Table - styled like report patient-info-table */}
        <div className="patient-card">
          <table className="patient-info-table">
            <tbody>
              <tr>
                <td className="info-label-cell">MRD No.:</td>
                <td className="info-value-cell">{appointmentData.MRD_No || "—"}</td>
                <td className="info-label-cell">Case ID / Receipt No.:</td>
                <td className="info-value-cell">{appointmentData.Case_ID || "—"}</td>
              </tr>
              <tr>
                <td className="info-label-cell">Patient Name:</td>
                <td className="info-value-cell">
                  {appointmentData.Patient || "—"}
                </td>
                <td className="info-label-cell">Age / Gender:</td>
                <td className="info-value-cell">
                  {appointmentData.Age != null || appointmentData.Sex
                    ? `${appointmentData.Age ?? "—"}/${appointmentData.Sex ?? "—"}`
                    : "—"}
                </td>
              </tr>
              <tr>
                <td className="info-label-cell">Date:</td>
                <td className="info-value-cell">
                  {displayDate || "—"}
                </td>
                <td className="info-label-cell">Valid upto:</td>
                <td className="info-value-cell">
                  {validUpto || "—"}
                </td>
              </tr>
              <tr>
                <td className="info-label-cell">Consultant:</td>
                <td className="info-value-cell-full" colSpan={3}>
                  {appointmentData.Doctor ? `Dr. ${appointmentData.Doctor.replace(/^Dr\.\s*/i, "")}` : "—"}
                  {appointmentData._department ? ` (${appointmentData._department})` : appointmentData.role ? ` (${appointmentData.role})` : ""}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Vitals: PR, BP, SpO2, Weight */}
        <div className="vitals-layout">
          <div className="vitals-main">
            <table className="vitals-table">
              <thead>
                <tr>
                  <th>Visit</th>
                  <th>First</th>
                  <th>Second</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="vitals-label-cell">Date</td>
                  <td className="vitals-value-cell">&nbsp;</td>
                  <td className="vitals-value-cell">&nbsp;</td>
                </tr>
                <tr>
                  <td className="vitals-label-cell">PR: (min)</td>
                  <td className="vitals-value-cell">{pulseValue}</td>
                  <td className="vitals-value-cell-empty"></td>
                </tr>
                <tr>
                  <td className="vitals-label-cell">BP: (mm hg)</td>
                  <td className="vitals-value-cell">{bpValue}</td>
                  <td className="vitals-value-cell-empty"></td>
                </tr>
                <tr>
                  <td className="vitals-label-cell">SpO2:</td>
                  <td className="vitals-value-cell">{spO2Value}</td>
                  <td className="vitals-value-cell-empty"></td>
                </tr>
                <tr>
                  <td className="vitals-label-cell">Weight: (Kg)</td>
                  <td className="vitals-value-cell">{weightValue}</td>
                  <td className="vitals-value-cell-empty"></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintPrescription;
