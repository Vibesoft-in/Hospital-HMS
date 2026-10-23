/**
 * fix-transaction-balance.js
 *
 * Pathlab system: finds all cases where balance equals the given amount
 * (caused by frontend scroll bug sending 1 less), then:
 *   - Adds the balance to the linked transaction's amountGiven
 *   - Sets case.balance = 0 and case.amountStatus = "Paid"
 *
 * Usage: node scripts/fix-transaction-balance.js
 */

const mongoose = require("mongoose");
const readline = require("readline");
const path = require("path");
const fs = require("fs");

// Load env the same way other scripts do
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

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

async function main() {
  // ── 1. Connect ───────────────────────────────────────────────────────────────
  const uri = process.env.DATABASE_URL;
  if (!uri) {
    console.error("❌  No MongoDB URI found. Set DATABASE_URL in your .env.development file.");
    process.exit(1);
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(uri);
  console.log("✅  Connected.\n");

  const Cases        = mongoose.connection.collection("cases");
  const Transactions = mongoose.connection.collection("transactions");

  // ── 2. Ask for balance amount ────────────────────────────────────────────────
  const balanceInput = await ask("Enter the balance amount to fix (e.g. 1): ");
  const balance = parseFloat(balanceInput.trim());

  if (isNaN(balance) || balance <= 0) {
    console.error("❌  Invalid balance amount.");
    rl.close();
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`\nSearching for cases with balance = ${balance}...\n`);

  // ── 3. Find affected cases ───────────────────────────────────────────────────
  const affectedCases = await Cases.find({ balance, deleted: { $ne: true } }).toArray();

  if (affectedCases.length === 0) {
    console.log(`✅  No cases found with balance = ${balance}. Nothing to fix.`);
    rl.close();
    await mongoose.disconnect();
    return;
  }

  // For each case, find its most recent transaction
  const rows = [];
  for (const c of affectedCases) {
    const tx = await Transactions.findOne(
      { caseId: c._id },
      { sort: { createdAt: -1 } }
    );
    rows.push({ case: c, tx });
  }

  // ── 4. Preview ───────────────────────────────────────────────────────────────
  console.log(`Found ${rows.length} case(s):\n`);
  const headers = ["caseId", "finalAmount", "balance", "transactionId", "currentAmountGiven", "newAmountGiven"];
  console.log("  " + headers.map((h) => h.padEnd(22)).join(""));
  console.log("  " + "-".repeat(headers.length * 22));

  for (const { case: c, tx } of rows) {
    console.log(
      "  " +
      [
        (c.caseId || c._id.toString()).padEnd(22),
        String(c.finalAmount ?? "N/A").padEnd(22),
        String(c.balance).padEnd(22),
        (tx ? (tx.transactionId || tx._id.toString()) : "NO TX FOUND").padEnd(22),
        String(tx ? tx.amountGiven : "N/A").padEnd(22),
        String(tx ? tx.amountGiven + balance : "N/A").padEnd(22),
      ].join("")
    );
  }

  const noTxCount = rows.filter((r) => !r.tx).length;
  if (noTxCount > 0) {
    console.log(`\n⚠️   ${noTxCount} case(s) have no linked transaction — their case.balance will still be fixed but no transaction will be updated.`);
  }

  // ── 5. Confirm ───────────────────────────────────────────────────────────────
  const confirm = await ask(
    `\nFor each case: add ${balance} to transaction.amountGiven, set case.balance=0, case.amountStatus="Paid".\nProceed? (yes/no): `
  );

  if (confirm.trim().toLowerCase() !== "yes") {
    console.log("Aborted. No changes made.");
    rl.close();
    await mongoose.disconnect();
    return;
  }

  // ── 6. Apply fix ─────────────────────────────────────────────────────────────
  let txUpdated = 0;
  let caseUpdated = 0;

  for (const { case: c, tx } of rows) {
    // Fix the transaction
    if (tx) {
      await Transactions.updateOne(
        { _id: tx._id },
        { $inc: { amountGiven: balance } }
      );
      txUpdated++;
    }

    // Fix the case
    await Cases.updateOne(
      { _id: c._id },
      { $set: { balance: 0, amountStatus: "Paid" } }
    );
    caseUpdated++;
  }

  console.log(`\n✅  Done.`);
  console.log(`   Transactions updated : ${txUpdated}`);
  console.log(`   Cases updated        : ${caseUpdated}`);

  rl.close();
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("❌  Error:", err.message || err);
  rl.close();
  mongoose.disconnect();
  process.exit(1);
});
