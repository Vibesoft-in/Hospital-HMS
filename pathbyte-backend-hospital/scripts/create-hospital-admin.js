const mongoose = require("mongoose");
const readline = require("readline");
const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");

// Load environment variables from config/environments/.env.development
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

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

async function getNextSequence(name) {
  const Counter = mongoose.model("Counter");
  const counter = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
}

async function createHospitalAdmin() {
  try {
    // Connect to MongoDB using DATABASE_URL from env
    const mongoUri = process.env.DATABASE_URL;
    if (!mongoUri) {
      console.log("❌ DATABASE_URL not found in config/environments/.env.development");
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    // Define Counter schema if not exists
    if (!mongoose.models.Counter) {
      const counterSchema = new mongoose.Schema({
        _id: String,
        seq: { type: Number, default: 0 },
      });
      mongoose.model("Counter", counterSchema);
    }

    // Define HospitalUser schema
    const hospitalUserSchema = new mongoose.Schema(
      {
        userId: { type: String, required: true, unique: true },
        username: { type: String, unique: true, sparse: true },
        email: {
          type: String,
          required: true,
          unique: true,
          lowercase: true,
          trim: true,
        },
        passwordHash: { type: String, required: true },
        name: { type: String, required: true },
        phoneNumber: { type: String },
        role: {
          type: String,
          enum: ["ADMIN", "RECEPTIONIST"],
          required: true,
        },
        isActive: { type: Boolean, default: true },
        deleted: { type: Boolean, default: false },
        deletedAt: { type: Date, default: null },
      },
      { timestamps: true }
    );

    const HospitalUser = mongoose.models.HospitalUser || mongoose.model("HospitalUser", hospitalUserSchema);

    // Check if any admin already exists
    const existingAdmin = await HospitalUser.findOne({
      role: "ADMIN",
      deleted: { $ne: true },
    });

    if (existingAdmin) {
      console.log("\n⚠️  An admin user already exists in the hospital system.");
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   User ID: ${existingAdmin.userId}`);
      console.log("\nIf you need to create another admin, please use the user management API.");
      rl.close();
      await mongoose.disconnect();
      process.exit(0);
    }

    console.log("\n🏥 Hospital Admin Creation Script");
    console.log("==================================\n");

    // Get user input
    const email = await question("Enter admin email: ");
    if (!email || !email.includes("@")) {
      console.log("❌ Invalid email address");
      rl.close();
      await mongoose.disconnect();
      process.exit(1);
    }

    const password = await question("Enter admin password (min 8 characters): ");
    if (!password || password.length < 8) {
      console.log("❌ Password must be at least 8 characters");
      rl.close();
      await mongoose.disconnect();
      process.exit(1);
    }

    const fullName = await question("Enter admin full name: ");
    if (!fullName) {
      console.log("❌ Full name is required");
      rl.close();
      await mongoose.disconnect();
      process.exit(1);
    }

    const phoneNumber = await question("Enter admin phone number (optional): ");

    // Create admin user
    const userIdNum = await getNextSequence("hospitalUserId");
    const userId = `HUS${String(userIdNum).padStart(5, "0")}`;
    
    // Auto-generate username from email
    const username = email.split("@")[0];

    const admin = await HospitalUser.create({
      userId,
      username,
      email,
      passwordHash: await hashPassword(password),
      name: fullName,
      phoneNumber: phoneNumber || undefined,
      role: "ADMIN",
      isActive: true,
      deleted: false,
    });

    console.log("\n✅ Hospital admin created successfully!");
    console.log("\nAdmin Details:");
    console.log(`   User ID: ${admin.userId}`);
    console.log(`   Username: ${admin.username}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Full Name: ${admin.name}`);
    console.log(`   Role: ${admin.role}`);
    console.log("\nYou can now login at: POST /api/v1/hospital/auth/login");
    console.log(`\nLogin credentials:`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Password: (the password you just entered)`);

  } catch (error) {
    console.error("\n❌ Error creating admin:", error.message);
    rl.close();
    await mongoose.disconnect();
    process.exit(1);
  } finally {
    rl.close();
    await mongoose.disconnect();
    process.exit(0);
  }
}

createHospitalAdmin();
