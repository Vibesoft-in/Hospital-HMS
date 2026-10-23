/**
 * Script to fix hospital user role from RECEPTIONIST → DOCTOR for doctor-linked users.
 * Usage: node scripts/fix-doctor-user-role.js
 *
 * Prompts for one or more doctor IDs (e.g. DOC001, DOC002) and updates the linked
 * HospitalUser role from RECEPTIONIST to DOCTOR.
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

  const doctorSchema = new mongoose.Schema(
    { doctorId: String, name: String },
    { strict: false }
  );
  const Doctor = mongoose.models.HospitalDoctor || mongoose.model("HospitalDoctor", doctorSchema, "hospitaldoctors");

  const userSchema = new mongoose.Schema(
    { userId: String, email: String, role: String, linkedDoctorId: String },
    { strict: false }
  );
  const User = mongoose.models.HospitalUser || mongoose.model("HospitalUser", userSchema, "hospitalusers");

  const input = (await question("Enter Doctor IDs to fix (comma-separated, e.g. DOC001,DOC002): ")).trim();
  if (!input) {
    console.error("❌ No doctor IDs provided");
    rl.close();
    await mongoose.disconnect();
    process.exit(1);
  }

  const doctorIds = input.split(",").map((d) => d.trim()).filter(Boolean);

  console.log("\nLooking up doctors...\n");

  const results = [];
  for (const doctorId of doctorIds) {
    const doctor = await Doctor.findOne({ doctorId });
    if (!doctor) {
      console.log(`⚠️  Doctor "${doctorId}" not found — skipping`);
      continue;
    }

    const user = await User.findOne({ linkedDoctorId: doctor._id.toString() });
    if (!user) {
      console.log(`⚠️  No linked user for doctor "${doctorId}" (${doctor.name}) — skipping`);
      continue;
    }

    console.log(`  Doctor : ${doctor.name} (${doctorId})`);
    console.log(`  User   : ${user.email} (${user.userId})`);
    console.log(`  Role   : ${user.role} → DOCTOR\n`);
    results.push({ doctor, user });
  }

  if (results.length === 0) {
    console.log("❌ Nothing to update.");
    rl.close();
    await mongoose.disconnect();
    process.exit(0);
  }

  const confirm = (await question(`Update ${results.length} user(s) role to DOCTOR? (yes/no): `)).trim().toLowerCase();
  if (confirm !== "yes") {
    console.log("❌ Aborted.");
    rl.close();
    await mongoose.disconnect();
    process.exit(0);
  }

  for (const { doctor, user } of results) {
    await User.updateOne({ _id: user._id }, { $set: { role: "DOCTOR" } });
    console.log(`✅ Updated: ${user.email} (${user.userId}) → DOCTOR`);
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
