const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");

const envPath = path.join(__dirname, "..", "config", "environments", ".env.development");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  envContent.split("\n").forEach((line) => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith("#")) {
      const [key, ...valueParts] = trimmedLine.split("=");
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join("=").trim();
      }
    }
  });
}

// ── HARDCODED PATIENT ─────────────────────────────────────────────────────
const SEARCH_ABHA_NUMBER   = "91625817004538";
const SEARCH_ABHA_ADDRESS  = "tarunsharma@sbx";
const SEARCH_NAME          = "Tarun Sharma";
const SEARCH_PHONE         = "+919592006789";
// ─────────────────────────────────────────────────────────────────────────

async function deletePatientData() {
  try {
    const mongoUri = process.env.DATABASE_URL;
    if (!mongoUri) { console.log("❌ DATABASE_URL not found"); process.exit(1); }

    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB\n");

    const HospitalPatientColl  = mongoose.connection.collection("hospitalpatients");
    const PathlabPatientColl   = mongoose.connection.collection("patients");
    const AbhaPatientColl      = mongoose.connection.collection("abhapatients");

    const phoneClean = SEARCH_PHONE.replace(/[\s\-+]/g, "");

    // Find AbhaPatient
    let abhaPatient = await AbhaPatientColl.findOne({
      $or: [
        { abhaNumber: SEARCH_ABHA_NUMBER },
        { preferredAbhaAddress: SEARCH_ABHA_ADDRESS },
        { name: new RegExp(SEARCH_NAME, "i") },
      ]
    });

    // Find HMS Patient
    let hmsPatient = await HospitalPatientColl.findOne({
      $or: [
        { abhaNumber: SEARCH_ABHA_NUMBER },
        { abhaAddress: SEARCH_ABHA_ADDRESS },
        { name: new RegExp(SEARCH_NAME, "i") },
        { phone: SEARCH_PHONE },
        { phone: phoneClean },
        { phone: phoneClean.slice(-10) },
        ...(abhaPatient ? [
          { abhaPatientId: abhaPatient._id },
          { abhaPatientId: abhaPatient._id.toString() },
        ] : []),
      ]
    });

    // Find Pathlab Patient
    let pathlabPatient = await PathlabPatientColl.findOne({
      $or: [
        { abhaNumber: SEARCH_ABHA_NUMBER },
        { abhaAddress: SEARCH_ABHA_ADDRESS },
        { firstName: new RegExp("Tarun", "i") },
        { name: new RegExp(SEARCH_NAME, "i") },
        { phoneNumbers: SEARCH_PHONE },
        { phoneNumbers: phoneClean },
        { phoneNumbers: phoneClean.slice(-10) },
        ...(abhaPatient ? [
          { abhaPatientId: abhaPatient._id },
          { abhaPatientId: abhaPatient._id.toString() },
        ] : []),
      ]
    });

    // Cross-find abhaPatient from hmsPatient if still not found
    if (!abhaPatient && hmsPatient?.abhaPatientId) {
      abhaPatient = await AbhaPatientColl.findOne({
        $or: [
          { _id: hmsPatient.abhaPatientId },
          { abhaNumber: hmsPatient.abhaNumber },
          { preferredAbhaAddress: hmsPatient.abhaAddress },
        ]
      });
    }

    if (!abhaPatient && !hmsPatient && !pathlabPatient) {
      console.log("❌ No patient found!");
      process.exit(0);
    }

    console.log("📋 Found:");
    if (hmsPatient)     console.log(`   HMS Patient:     ${hmsPatient.name} (${hmsPatient._id})`);
    if (pathlabPatient) console.log(`   Pathlab Patient: ${pathlabPatient.firstName || pathlabPatient.name} (${pathlabPatient._id})`);
    if (abhaPatient)    console.log(`   ABHA Patient:    ${abhaPatient.name} | ${abhaPatient.abhaNumber} | ${abhaPatient.preferredAbhaAddress} (${abhaPatient._id})`);

    console.log("\n🗑️  Deleting all data...\n");

    const hmsId  = hmsPatient?._id  || null;
    const pathId = pathlabPatient?._id || null;
    const abhaId = abhaPatient?._id  || null;

    // FHIR Health Records
    const allPatientIds = [hmsId, pathId].filter(Boolean);
    if (allPatientIds.length) {
      const r = await mongoose.connection.collection("fhirhealthinformations").deleteMany({ patientId: { $in: allPatientIds } });
      console.log(`✅ FHIR Health Records: ${r.deletedCount}`);
    }

    if (hmsId) {
      let r;
      r = await mongoose.connection.collection("hospitalipds").deleteMany({ patientId: hmsId });
      console.log(`✅ IPD Records: ${r.deletedCount}`);

      r = await mongoose.connection.collection("hospitalvisits").deleteMany({ patientId: hmsId });
      console.log(`✅ Visit Records: ${r.deletedCount}`);

      r = await mongoose.connection.collection("hospitaldaycareappointments").deleteMany({ patientId: hmsId });
      console.log(`✅ Daycare Records: ${r.deletedCount}`);

      r = await mongoose.connection.collection("hospitaltransactions").deleteMany({ patientId: hmsId });
      console.log(`✅ Hospital Transactions: ${r.deletedCount}`);

      r = await mongoose.connection.collection("hospitalpharmatokens").deleteMany({ patientId: hmsId });
      console.log(`✅ Pharma Tokens: ${r.deletedCount}`);

      r = await mongoose.connection.collection("hospitalpatients").deleteOne({ _id: hmsId });
      console.log(`✅ Hospital Patient: ${r.deletedCount}`);
    }

    if (pathId) {
      let r;
      r = await mongoose.connection.collection("cases").deleteMany({ patientId: pathId });
      console.log(`✅ Pathlab Cases: ${r.deletedCount}`);

      r = await mongoose.connection.collection("transactions").deleteMany({ patientId: pathId });
      console.log(`✅ Pathlab Transactions: ${r.deletedCount}`);

      r = await mongoose.connection.collection("patients").deleteOne({ _id: pathId });
      console.log(`✅ Pathlab Patient: ${r.deletedCount}`);
    }

    if (abhaId) {
      const abhaAddr = abhaPatient.preferredAbhaAddress;
      let r;
      r = await mongoose.connection.collection("abdmconsents").deleteMany({ abhaPatientId: abhaId });
      console.log(`✅ ABDM Consents: ${r.deletedCount}`);

      r = await mongoose.connection.collection("abdmhiuconsents").deleteMany({ $or: [{ abhaPatientId: abhaId }, { patientAbhaAddress: abhaAddr }] });
      console.log(`✅ ABDM HIU Consents: ${r.deletedCount}`);

      r = await mongoose.connection.collection("abdmlinksessions").deleteMany({ abhaPatientId: abhaId });
      console.log(`✅ ABDM Link Sessions: ${r.deletedCount}`);

      r = await mongoose.connection.collection("abdmcarecontexts").deleteMany({ abhaPatientId: abhaId });
      console.log(`✅ ABDM Care Contexts: ${r.deletedCount}`);

      r = await mongoose.connection.collection("abhapatients").deleteOne({ _id: abhaId });
      console.log(`✅ ABHA Patient: ${r.deletedCount}`);
    }

    console.log("\n🎉 Done!\n");

  } catch (err) {
    console.error("❌ Error:", err.message);
    console.error(err.stack);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

deletePatientData();
