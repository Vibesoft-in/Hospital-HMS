"use client";

/**
 * openDialysisPrintWindow
 *
 * Reads every named input / textarea / checkbox / radio from the supplied
 * <form> element and opens a new window with a purpose-built HTML print page.
 * The new window auto-triggers window.print() once loaded.
 */
export function openDialysisPrintWindow(form: HTMLFormElement) {
  const fd = new FormData(form);
  const get = (name: string) => (fd.get(name)?.toString().trim() ?? "");
  const checked = (name: string) =>
    (form.querySelector(`[name="${name}"]`) as HTMLInputElement | null)
      ?.checked ?? false;
  const radio = (name: string) => get(name);
  const todayIst = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());
  const createdAtRaw = get("meta.sessionDate") || get("meta.createdAt");
  const printDateIst = (() => {
    if (!createdAtRaw) return todayIst;
    const parsed = new Date(createdAtRaw);
    if (Number.isNaN(parsed.getTime())) return todayIst;
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(parsed);
  })();

  /** Absolute URL with encoded path — spaces in filename break img src in iframe print. */
  const logoUrl =
    typeof window !== "undefined"
      ? new URL(encodeURI("/JJM Logo.png"), window.location.origin).href
      : encodeURI("/JJM Logo.png");

  // ── collect values ─────────────────────────────────────────────────────────
  const v = {
    machineNumber: get("general.machineNumber"),
    mrdNo: get("general.mrdNo"),
    technicianName: get("general.technicianName"),
    startTime: get("general.startTime"),
    endTime: get("general.endTime"),
    patientName: get("patient.name"),
    patientAge: get("patient.age"),
    patientGender: get("patient.gender"),
    dialyzerSingle: checked("general.dialyzerUsageSingleUse"),
    dialyzerReuse: checked("general.dialyzerUsageReuse"),
    timesReused: get("general.timesReused"),
    bolus: get("general.bolus"),
    hourly: get("general.hourly"),
    fiberVolume: get("general.fiberVolume"),
    heparinUse: get("general.heparinUse"),
    height: get("general.height"),
    preHdWeight: get("general.preHdWeightToday"),
    lastPostHdWeight: get("general.lastPostHdWeight"),
    weightGain: get("general.weightGain"),
    targetWeightLoss: get("general.targetWeightLoss"),
    postHdWeightToday: get("general.postHdWeightToday"),
    actualWeightLoss: get("general.actualWeightLoss"),
    targetDryWeight: get("general.targetDryWeight"),
    remainingWeightLoss: get("general.remainingWeightLoss"),
    avf: checked("general.avfSelected"),
    avg: checked("general.avgSelected"),
    ijv: checked("general.ijvSelected"),
    femoral: checked("general.femoralSelected"),
    tunneled: checked("general.tunneledCatheter"),
    centralYes: checked("general.centralLineYes"),
    centralNo: checked("general.centralLineNo"),
    centralLineSite: radio("general.centralLineSite"),
    needle16g: checked("general.avfNeedleSize16G"),
    needle17g: checked("general.avfNeedleSize17G"),
    needleOthers: checked("general.avfNeedleSizeOthers"),
    needleOthersValue: get("general.avfNeedleSizeOthersValue"),
    bruitPresent: checked("general.bruitThrillPresent"),
    bruitAbsent: checked("general.bruitThrillAbsent"),
    bruitNA: checked("general.bruitThrillNotApplicable"),

    // pre-dialysis
    bpStartHd: get("pre.bpStartHd"),
    spo2: get("pre.spo2"),
    bodyTemp: get("pre.bodyTemperature"),
    prePulse: get("pre.pulse"),

    // monitoring rows
    monitoring: Array.from({ length: 8 }, (_, i) => ({
      time: get(`monitoring.${i}.timeOnHd`),
      pr: get(`monitoring.${i}.pr`),
      bp: get(`monitoring.${i}.bp`),
      bfr: get(`monitoring.${i}.bfr`),
      dfr: get(`monitoring.${i}.dfr`),
      ufr: get(`monitoring.${i}.ufr`),
      totalUf: get(`monitoring.${i}.totalUf`),
      temperature: get(`monitoring.${i}.temperature`),
      dyna: get(`monitoring.${i}.dyna`),
      heparin: get(`monitoring.${i}.heparin`),
      rbs: get(`monitoring.${i}.rbs`),
    })),

    // post dialysis
    postPulse: get("post.pulse"),
    postBp: get("post.bp"),
    postBodyTemp: get("post.bodyTemperature"),
    postHdWeight: get("post.postHdWeight1"),
    ufRemoved: get("post.ufRemoved"),
    prolongedBleeding: radio("post.prolongedBleeding"),
    postBruitPresent: checked("post.bruitThrillPresent"),
    postBruitAbsent: checked("post.bruitThrillAbsent"),
    postBruitNA: checked("post.bruitThrillNotApplicable"),
    ktV: get("post.ktVAchieved"),

    // complications
    hypotension: checked("comp.hypotension"),
    fever: checked("comp.fever"),
    headache: checked("comp.headache"),
    rigor: checked("comp.rigor"),
    cramps: checked("comp.cramps"),
    rash: checked("comp.rash"),
    vomiting: checked("comp.vomiting"),
    chestPain: checked("comp.chestPain"),
    dyspnea: checked("comp.dyspnea"),
    pruritus: checked("comp.pruritus"),
    dialyzerReaction: checked("comp.dialyzerReaction"),
    seizures: checked("comp.seizures"),
    noComplication: checked("comp.noComplication"),
    formSibring: checked("comp.formSibring"),
    hypoglycemia: checked("comp.hypoglycemia"),
    hypertension: checked("comp.hypertension"),
    otherComp: get("comp.other"),

    // treatment
    epoDosage: get("treat.epoDosage"),
    epoGivenBy: get("treat.epoGivenBy"),
    ivIronDose: get("treat.ivIronDose"),
    bloodTransfusion: radio("treat.bloodTransfusion"),
    numberOfUnits: get("treat.numberOfUnits"),
    bloodBankName: get("treat.bloodBankName"),
    typeOfBlood: get("treat.typeOfBlood"),
    otherDrug: get("treat.otherTreatmentGivenDrug"),
  };

  // ── helpers ────────────────────────────────────────────────────────────────
  /** Checkbox square: filled tick or empty box */
  const box = (isChecked: boolean) =>
    `<span class="chk">${isChecked ? "&#10003;" : "&nbsp;"}</span>`;

  /** A labelled box field — box border, generous height */
  const field = (val: string, width = "130px") =>
    `<div class="field" style="width:${width}">${val || "&nbsp;"}</div>`;

  /** A label + field stacked vertically, with a min-width */
  const cell = (label: string, value: string, minWidth = "auto") =>
    `<div class="cell" style="min-width:${minWidth}">
      <div class="lbl">${label}</div>
      ${value}
    </div>`;

  /** A horizontal flex row of cells */
  const row = (...cells: string[]) =>
    `<div class="flex-row">${cells.join("")}</div>`;

  // ── monitoring table rows ──────────────────────────────────────────────────
  const monRows = v.monitoring
    .map(
      (r) => `
      <tr>
        <td>${r.time}</td>
        <td>${r.pr}</td>
        <td>${r.bp}</td>
        <td>${r.bfr}</td>
        <td>${r.dfr}</td>
        <td>${r.ufr}</td>
        <td>${r.totalUf}</td>
        <td>${r.temperature}</td>
        <td>${r.dyna}</td>
        <td>${r.heparin}</td>
        <td>${r.rbs}</td>
      </tr>`
    )
    .join("");

  // ── complication list ──────────────────────────────────────────────────────
  const compList: [boolean, string][] = [
    [v.hypotension, "Hypotension"],
    [v.fever, "Fever"],
    [v.headache, "Headache"],
    [v.noComplication, "No Complication"],
    [v.rigor, "Rigor"],
    [v.cramps, "Cramps"],
    [v.rash, "Rash"],
    [v.vomiting, "Vomiting"],
    [v.chestPain, "Chest Pain"],
    [v.dyspnea, "Dyspnea"],
    [v.pruritus, "Pruritus"],
    [v.dialyzerReaction, "Dialyzer Reaction"],
    [v.seizures, "Seizures"],
    [v.formSibring, "Sibring"],
    [v.hypoglycemia, "Hypoglycemia"],
    [v.hypertension, "Hypertension"],
  ];

  const html = /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Dialysis Session Form</title>
  <style>
    /* ── Reset ── */
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: Tahoma, Arial, sans-serif;
      font-size: 11.5pt;
      color: #111;
      background: #fff;
      padding: 2px 14px 10mm 14px;
      line-height: 1.25;
    }

    /* ── Letterhead: same visual as receipt print, full width to match form below ── */
    .receipt-container {
      width: 100%;
      max-width: none;
      margin: 0 0 10px 0;
      padding: 0;
      background: #fff;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 2px solid #000;
      gap: 12px;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .header-center {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 54px;
    }
    .logo-img {
      width: 54px;
      height: 54px;
      object-fit: contain;
      flex-shrink: 0;
    }
    .header-info h2 {
      font-size: 20px;
      font-weight: bold;
      margin: 0 0 2px 0;
      color: #000;
      background: transparent;
      border: none;
      border-left: none;
      padding: 0;
    }
    .header-info .certification {
      font-size: 12px;
      color: #000;
      margin-top: 2px;
    }
    .header-right {
      text-align: right;
    }
    .header-right .address {
      font-size: 14px;
      color: #000;
      margin-bottom: 4px;
      line-height: 1.4;
    }
    .header-right .contact {
      font-size: 14px;
      color: #000;
      line-height: 1.6;
    }

    /* ── Form section headings only (not letterhead title) ── */
    h2.dialysis-section-heading {
      font-size: 11pt;
      font-weight: bold;
      background: #eee;
      padding: 3px 8px;
      border-left: 4px solid #444;
      margin: 6px 0 4px;
    }

    /* ── Section wrapper ── */
    .section {
      border: 1px solid #aaa;
      border-radius: 3px;
      padding: 5px;
      margin-bottom: 6px;
    }

    /* ── Horizontal flex row ── */
    .flex-row {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: 6px 12px;
      margin-bottom: 5px;
    }

    /* Push content to the right (match form UI) ── */
    .push-right {
      margin-left: auto;
    }

    /* ── Label + control stacked ── */
    .cell {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }

    /* ── Field label ── */
    .lbl {
      font-size: 9pt;
      color: #333;
      font-weight: bold;
      white-space: nowrap;
    }

    /* ── Box-style text field ── */
    .field {
      display: inline-block;
      border: 1.5px solid #666;
      border-radius: 3px;
      min-height: 20px;
      padding: 2px 5px;
      font-size: 11pt;
      background: #fff;
    }

    /* ── Textarea-style box ── */
    .textarea-field {
      width: 100%;
      min-height: 52px;
      border: 1.5px solid #666;
      border-radius: 3px;
      padding: 5px 8px;
      font-size: 12pt;
      white-space: pre-wrap;
      word-break: break-word;
      background: #fff;
      margin-top: 6px;
    }

    /* ── Checkbox square ── */
    .chk {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 15px;
      height: 15px;
      border: 1.5px solid #555;
      border-radius: 2px;
      font-size: 11pt;
      font-weight: bold;
      margin-right: 4px;
      vertical-align: middle;
      flex-shrink: 0;
    }

    /* ── Inline checkbox group ── */
    .inline-group {
      display: flex;
      flex-wrap: wrap;
      gap: 6px 16px;
      align-items: center;
      padding-top: 2px;
    }

    .inline-item {
      display: flex;
      align-items: center;
      gap: 3px;
      font-size: 10pt;
      white-space: nowrap;
    }

    /* ── Dialysis monitoring table ── */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10pt;
      margin-top: 6px;
    }

    th {
      border: 1.5px solid #777;
      padding: 6px 4px;
      text-align: center;
      background: #ddd;
      font-size: 10pt;
      font-weight: bold;
    }

    th.col-time { width: 7%; }
    th.col-bp { width: 10%; }
    th.col-rbs { width: 12%; }

    td {
      border: 1.5px solid #777;
      padding: 0;
      text-align: center;
      height: 29px;          /* tightened rows to save space */
      vertical-align: middle;
      font-size: 11pt;
    }

    /* ── Complications grid ── */
    .comp-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px 16px;
    }

    /* ── Page break: avoid splitting a section ── */
    .section {
      page-break-inside: avoid;
    }

    /* ── Print settings (page margins aligned with receipt print) ── */
    @page {
      margin: 8mm 10mm 10mm 10mm;
      size: A4 portrait;
    }

    @media print {
      body {
        padding: 0;
        background: white !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <div class="header">
      <div class="header-left">
        <img src="${logoUrl}" alt="JJM Hospital" class="logo-img" />
        <div class="header-info">
          <h2>JJM Hospital</h2>
          <div class="certification">ISO 9001:2000 Certified</div>
        </div>
      </div>
      <div class="header-center"></div>
      <div class="header-right">
        <div class="address">
          Jaspur Rd, opposite Anaj Mandi, Sarverkhera,<br />
          Kashipur, Uttarakhand 244713
        </div>
        <div class="contact">
          Phone: +91 9634844075<br />
        </div>
      </div>
    </div>
  </div>

  <!-- ══════════════════ PATIENT INFO ROW ══════════════════════════════ -->
  <div style="display: flex; gap: 20px; margin-bottom: 8px; font-size: 12pt;">
    <div><strong>Patient Name:</strong> ${v.patientName || "____________________"}</div>
    <div><strong>Age:</strong> ${v.patientAge || "_____"}</div>
    <div><strong>Sex:</strong> ${v.patientGender || "__________"}</div>
  </div>

  <!-- ══════════════════ EMPTY SESSION INFO ════════════════════════════ -->
  <div style="display: flex; gap: 40px; align-items: center; margin-bottom: 12px; font-size: 11pt;">
    <div style="display: flex; align-items: center; gap: 8px;">
      <strong>Date:</strong>
      <span>${printDateIst || "—"}</span>
    </div>
    <div style="display: flex; align-items: center; gap: 8px;">
      <strong>Start T/t Time:</strong>
      <span>${v.startTime || "—"}</span>
    </div>
    <div style="display: flex; align-items: center; gap: 8px;">
      <strong>End T/t Time:</strong>
      <span>${v.endTime || "—"}</span>
    </div>
  </div>

  <!-- ══════════════════ GENERAL INFORMATION ══════════════════════════════ -->
  <h2 class="dialysis-section-heading">General Information</h2>
  <div class="section">

    ${row(
    cell("Machine Number", field(v.machineNumber, "150px"), "150px"),
    cell("MRD No.", field(v.mrdNo, "150px"), "150px"),
    `<div class="cell push-right" style="min-width: 220px;">
      <div class="lbl">Technician Name</div>
      ${field(v.technicianName, "220px")}
    </div>`
  )}

    ${row(
    `<div class="cell">
        <div class="lbl">Dialyzer Usage Type</div>
        <div class="inline-group">
          <span class="inline-item">${box(v.dialyzerSingle)} Single Use</span>
          <span class="inline-item">${box(v.dialyzerReuse)} Reuse</span>
        </div>
      </div>`,
    cell("Times Reused", field(v.timesReused, "100px"), "100px"),
    `<div class="push-right" style="display: flex; gap: 12px; align-items: flex-end;">
      ${cell("Fiber Volume", field(v.fiberVolume, "120px"), "120px")}
      ${cell("Heparin Use", field(v.heparinUse, "120px"), "120px")}
    </div>`
  )}

    ${row(
    cell("Height", field(v.height, "100px"), "100px"),
    cell("Pre HD Weight Today", field(v.preHdWeight, "110px"), "110px"),
    cell("Last Post HD Weight", field(v.lastPostHdWeight, "110px"), "110px"),
    cell("Weight Gain", field(v.weightGain, "100px"), "100px"),
    cell("Target Weight Loss", field(v.targetWeightLoss, "110px"), "110px"),
    cell("Post HD Weight Today", field(v.postHdWeightToday, "110px"), "110px"),
    cell("Actual Weight Loss", field(v.actualWeightLoss, "110px"), "110px"),
    cell("Bolus", field(v.bolus, "90px"), "90px"),
    cell("Hourly", field(v.hourly, "90px"), "90px")
  )}

    ${row(
    cell("Target Dry Weight", field(v.targetDryWeight, "120px"), "120px"),
    cell("Remain Weight Loss", field(v.remainingWeightLoss, "120px"), "120px"),
    `<div class="cell" style="flex:1">
        <div class="lbl">Vascular Access</div>
        <div class="inline-group">
          <span class="inline-item">${box(v.avf)} AVF</span>
          <span class="inline-item">${box(v.avg)} AVG</span>
          <span class="inline-item">${box(v.ijv)} IJV</span>
          <span class="inline-item">${box(v.femoral)} Femoral</span>
          <span class="inline-item">${box(v.tunneled)} Tunneled Catheter</span>
        </div>
      </div>`
  )}

    ${row(
    `<div class="cell">
        <div class="lbl">Central Line</div>
        <div class="inline-group">
          <span class="inline-item">${box(v.centralYes)} Yes</span>
          <span class="inline-item">${box(v.centralNo)} No</span>
          <span class="inline-item">${box(v.centralLineSite === "ijv")} IJV</span>
          <span class="inline-item">${box(v.centralLineSite === "femoral")} Femoral</span>
        </div>
      </div>`,
    `<div class="cell">
        <div class="lbl">AVF Needle Size</div>
        <div class="inline-group">
          <span class="inline-item">${box(v.needle16g)} 16G</span>
          <span class="inline-item">${box(v.needle17g)} 17G</span>
          <span class="inline-item">${box(v.needleOthers)} Others${v.needleOthersValue ? ` (${v.needleOthersValue})` : ""}</span>
        </div>
      </div>`,
    `<div class="cell">
        <div class="lbl">Bruit / Thrill</div>
        <div class="inline-group">
          <span class="inline-item">${box(v.bruitPresent)} Present</span>
          <span class="inline-item">${box(v.bruitAbsent)} Absent</span>
          <span class="inline-item">${box(v.bruitNA)} Not Applicable</span>
        </div>
      </div>`
  )}
  </div>

  <!-- ══════════════════ PRE-DIALYSIS ASSESSMENT ═══════════════════════════ -->
  <h2 class="dialysis-section-heading">Pre-Dialysis Assessment</h2>
  <div class="section">
    ${row(
    cell("BP at Start of HD", field(v.bpStartHd, "130px"), "130px"),
    cell("SPO2", field(v.spo2, "100px"), "100px"),
    cell("Body Temperature", field(v.bodyTemp, "130px"), "130px"),
    cell("Pulse", field(v.prePulse, "100px"), "100px")
  )}
  </div>

  <!-- ══════════════════ DIALYSIS MONITORING ══════════════════════════════ -->
  <h2 class="dialysis-section-heading">Dialysis Monitoring</h2>
  <div class="section">
    <table>
      <thead>
        <tr>
          <th class="col-time">Time on HD</th>
          <th>PR</th>
          <th class="col-bp">BP</th>
          <th>BFR</th>
          <th>DFR</th>
          <th>UFR</th>
          <th>Total UF</th>
          <th>Temp.</th>
          <th>DyNa</th>
          <th>Heparin</th>
          <th class="col-rbs">RBS</th>
        </tr>
      </thead>
      <tbody>
        ${monRows}
      </tbody>
    </table>
  </div>

  <!-- ══════════════════ POST-DIALYSIS ASSESSMENT ══════════════════════════ -->
  <h2 class="dialysis-section-heading" style="page-break-before: always;">Post Dialysis Assessment</h2>
  <div class="section">
    ${row(
    cell("Pulse", field(v.postPulse, "100px"), "100px"),
    cell("BP", field(v.postBp, "100px"), "100px"),
    cell("Body Temperature", field(v.postBodyTemp, "130px"), "130px"),
    cell("Post HD Weight", field(v.postHdWeight, "120px"), "120px"),
    cell("UF Removed", field(v.ufRemoved, "110px"), "110px"),
    cell("KT / V Achieved", field(v.ktV, "110px"), "110px")
  )}
    ${row(
    `<div class="cell">
        <div class="lbl">Prolonged Bleeding from Access Site</div>
        <div class="inline-group">
          <span class="inline-item">${box(v.prolongedBleeding === "Yes")} Yes</span>
          <span class="inline-item">${box(v.prolongedBleeding === "No")} No</span>
        </div>
      </div>`,
    `<div class="cell">
        <div class="lbl">Bruit / Thrill (AVF / AVG)</div>
        <div class="inline-group">
          <span class="inline-item">${box(v.postBruitPresent)} Present</span>
          <span class="inline-item">${box(v.postBruitAbsent)} Absent</span>
          <span class="inline-item">${box(v.postBruitNA)} Not Applicable</span>
        </div>
      </div>`
  )}
  </div>

  <!-- ══════════════════ COMPLICATIONS ════════════════════════════════════ -->
  <h2 class="dialysis-section-heading">Complications During Dialysis</h2>
  <div class="section">
    <div class="comp-grid">
      ${compList
      .map(([c, label]) => `<div class="inline-item">${box(c)} ${label}</div>`)
      .join("")}
    </div>
    ${v.otherComp
      ? `<div style="margin-top:10px">
            <div class="lbl">Other Complications</div>
            <div class="textarea-field">${v.otherComp}</div>
          </div>`
      : ""
    }
  </div>

  <!-- ══════════════════ TREATMENT GIVEN ══════════════════════════════════ -->
  <h2 class="dialysis-section-heading">Treatment Given</h2>
  <div class="section">
    ${row(
      cell("EPO Dosage", field(v.epoDosage, "130px"), "130px"),
      cell("EPO Given By", field(v.epoGivenBy, "150px"), "150px"),
      cell("IV Iron Dose", field(v.ivIronDose, "130px"), "130px")
    )}
    ${row(
      `<div class="cell">
        <div class="lbl">Blood Transfusion</div>
        <div class="inline-group">
          <span class="inline-item">${box(v.bloodTransfusion === "Yes")} Yes</span>
          <span class="inline-item">${box(v.bloodTransfusion === "No")} No</span>
        </div>
      </div>`,
      cell("Number of Units", field(v.numberOfUnits, "120px"), "120px"),
      cell("Blood Bank Name", field(v.bloodBankName, "180px"), "180px"),
      cell("Type of Blood", field(v.typeOfBlood, "150px"), "150px")
    )}
    ${v.otherDrug
      ? `<div style="margin-top:4px">
            <div class="lbl">Other Treatment Given Drug</div>
            <div class="textarea-field">${v.otherDrug}</div>
          </div>`
      : ""
    }
  </div>

  <!-- ══════════════════ SIGNATURE SECTION ══════════════════════════════════ -->
  <div style="margin-top: 100px; display: flex; justify-content: space-between; font-weight: bold; font-size: 11pt; padding: 0 40px; color: #111;">
    <div style="text-align: center; border-top: 1.5px solid #666; width: 180px; padding-top: 5px;">Completed By</div>
    <div style="text-align: center; border-top: 1.5px solid #666; width: 180px; padding-top: 5px;">Signature</div>
    <div style="text-align: center; border-top: 1.5px solid #666; width: 180px; padding-top: 5px;">Dr. In charge</div>
  </div>
</body>
</html>`;

  // Use a hidden iframe instead of window.open() so printing works without a popup
  // (async flows and some browsers block popups that are not from a direct user gesture).
  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "Dialysis print");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;";
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument ?? iframe.contentWindow?.document;
  const iframeWin = iframe.contentWindow;
  if (!iframeDoc || !iframeWin) {
    iframe.remove();
    return;
  }

  iframeDoc.open();
  iframeDoc.write(html);
  iframeDoc.close();

  const cleanup = () => {
    iframe.remove();
  };

  const runPrint = () => {
    try {
      iframeWin.focus();
      iframeWin.print();
    } finally {
      window.setTimeout(cleanup, 750);
    }
  };

  const waitForImagesThenPrint = () => {
    const imgs = Array.from(iframeDoc.images);
    const pending = imgs.filter((img) => !img.complete);
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      window.setTimeout(runPrint, 200);
    };
    if (pending.length === 0) {
      finish();
      return;
    }
    let left = pending.length;
    const step = () => {
      left--;
      if (left <= 0) finish();
    };
    pending.forEach((img) => {
      img.addEventListener("load", step, { once: true });
      img.addEventListener("error", step, { once: true });
    });
    window.setTimeout(finish, 3500);
  };

  window.setTimeout(waitForImagesThenPrint, 0);
}
