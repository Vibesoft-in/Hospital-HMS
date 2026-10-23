/**
 * test-whatsapp.js
 *
 * Quick test to verify WhatsApp template message sending.
 * Sends the "pathbyte_welcome" template to a test number.
 *
 * Usage: node scripts/test-whatsapp.js
 */

const path = require("path");
const fs = require("fs");
const axios = require("axios");

// Load env
const envPath = path.join(__dirname, "..", "config", "environments", ".env.development");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...valueParts] = trimmed.split("=");
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join("=").trim();
      }
    }
  });
}

const PHONE_NUMBER_ID = process.env.phoneNumberId;
const ACCESS_TOKEN    = process.env.accessToken;
const TO              = "916398317883";
const TEMPLATE_NAME   = "hello_world";
const LANGUAGE_CODE   = "en_US";

if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
  console.error("Missing credentials: phoneNumberId or accessToken not found in .env.development");
  process.exit(1);
}

async function sendTestMessage() {
  const url = `https://graph.facebook.com/v23.0/${PHONE_NUMBER_ID}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: TO,
    type: "template",
    template: {
      name: TEMPLATE_NAME,
      language: { code: LANGUAGE_CODE },
    },
  };

  console.log("Sending WhatsApp message...");
  console.log("To:", TO);
  console.log("Template:", TEMPLATE_NAME);
  console.log("Payload:", JSON.stringify(payload, null, 2));

  try {
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    console.log("\n✅ Success!");
    console.log("Response:", JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error("\n❌ Failed!");
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Error:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error("Error:", error.message);
    }
    process.exit(1);
  }
}

sendTestMessage();
