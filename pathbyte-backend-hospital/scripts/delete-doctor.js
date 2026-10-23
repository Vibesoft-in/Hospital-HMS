/**
 * Script to delete a doctor and their linked hospital user account.
 * Usage: node scripts/delete-doctor.js
 *
 * Prompts for a doctor ID (e.g. DOC003) and permanently deletes:
 *   1. The HospitalDoctor document
 *   2. The linked HospitalUser document (matched by linkedDoctorId = doctor._id)
 */

const mongoose = require("mongoose");
const readline = require("readline");
const path = require("path");
const fs = require("fs");

// Load env
const envPath = path.join(__dirname, "..", "config", "environments", ".env.development");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf8")
    .split("\n")
    .forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...rest] = trimmed.split("=");
        if (key && rest.length > 0) process.env[key.trim()] = rest.join("=").trim();
      }
    });
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (q) => new Promise((res) => rl.question(q, res));

async function run() {
  const mongoUri = process.env.DATABASE_URL;
  if (!mongoUri) {
    console.error("❌ DATABASE_URL not set");
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log("✅ Connected to MongoDB\n");

  // Doctor schema (minimal — just what we need)
  const doctorSchema = new mongoose.Schema(
    { doctorId: String, name: String, isDeleted: Boolean },
    { strict: false }
  );
  const Doctor = mongoose.models.HospitalDoctor || mongoose.model("HospitalDoctor", doctorSchema, "hospitaldoctors");

  // User schema (minimal)
  const userSchema = new mongoose.Schema(
    { userId: String, email: String, role: String, linkedDoctorId: String, deleted: Boolean },
    { strict: false }
  );
  const User = mongoose.models.HospitalUser || mongoose.model("HospitalUser", userSchema, "hospitalusers");

  const doctorId = (await question("Enter Doctor ID to delete (e.g. DOC003): ")).trim();
  if (!doctorId) {
    console.error("❌ Doctor ID is required");
    rl.close();
    await mongoose.disconnect();
    process.exit(1);
  }

  // Find the doctor
  const doctor = await Doctor.findOne({ doctorId });
  if (!doctor) {
    console.error(`❌ No doctor found with doctorId = "${doctorId}"`);
    rl.close();
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`\nFound doctor:`);
  console.log(`  Doctor ID : ${doctor.doctorId}`);
  console.log(`  Name      : ${doctor.name}`);
  console.log(`  MongoDB ID: ${doctor._id}`);

  // Find the linked user
  const linkedUser = await User.findOne({ linkedDoctorId: doctor._id.toString() });
  if (linkedUser) {
    console.log(`\nLinked user:`);
    console.log(`  User ID : ${linkedUser.userId}`);
    console.log(`  Email   : ${linkedUser.email}`);
    console.log(`  Role    : ${linkedUser.role}`);
  } else {
    console.log(`\n⚠️  No linked user account found for this doctor.`);
  }

  const confirm = (await question(`\n⚠️  Permanently delete doctor "${doctor.name}" (${doctorId}) and their user account? (yes/no): `)).trim().toLowerCase();
  if (confirm !== "yes") {
    console.log("❌ Aborted.");
    rl.close();
    await mongoose.disconnect();
    process.exit(0);
  }

  // Delete doctor
  await Doctor.deleteOne({ _id: doctor._id });
  console.log(`\n✅ Deleted doctor: ${doctor.name} (${doctorId})`);

  // Delete linked user
  if (linkedUser) {
    await User.deleteOne({ _id: linkedUser._id });
    console.log(`✅ Deleted linked user: ${linkedUser.email} (${linkedUser.userId})`);
  }

  console.log("\n✅ Done!");
  rl.close();
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
