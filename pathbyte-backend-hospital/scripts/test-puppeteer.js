#!/usr/bin/env node
/**
 * Puppeteer Smoke Test
 * -------------------
 * Tests Puppeteer exactly as configured in src/libs/utils/generatePdf.ts
 * Run from the project root: node scripts/test-puppeteer.js
 *
 * What it checks:
 *  1. Chromium binary is found and launchable
 *  2. A page can be opened and HTML content set
 *  3. A real A4 PDF can be generated (letterpad style — same as production)
 *  4. A real A4 PDF can be generated (plain style)
 *  5. SVG background embedding works (same logic as letterpad template)
 *  6. PDF output is a valid non-empty buffer
 *  7. Browser closes cleanly (no zombie processes)
 */

"use strict";

const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

// Load env the same way server.ts does
const envFile = `.env.${process.env.NODE_ENV || "production"}`;
const envFilePath = path.resolve(process.cwd(), "config", "environments", envFile);
if (fs.existsSync(envFilePath)) {
  dotenv.config({ path: envFilePath });
  console.log(`Loaded env from: ${envFilePath}`);
} else {
  console.warn(`Env file not found: ${envFilePath} — using process.env as-is`);
}

// ---- Config (mirrors generatePdf.ts exactly) --------------------------------
const LAUNCH_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--disable-gpu",
  "--no-first-run",
  "--no-zygote",
  "--single-process",
  "--disable-web-security",
];

const EXECUTABLE_PATH =
  process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/chromium-browser";

// ---- Helpers ----------------------------------------------------------------
let passed = 0;
let failed = 0;

function ok(msg) {
  console.log(`  ✅  ${msg}`);
  passed++;
}

function fail(msg, err) {
  console.error(`  ❌  ${msg}`);
  if (err) console.error(`      ${err.message || err}`);
  failed++;
}

// ---- Tests ------------------------------------------------------------------
async function runTests() {
  console.log("\n==============================================");
  console.log(" Puppeteer Smoke Test — Pathbyte Backend");
  console.log("==============================================\n");

  // Test 1: Chromium binary exists
  console.log("Test 1: Chromium binary check");
  if (fs.existsSync(EXECUTABLE_PATH)) {
    ok(`Chromium found at: ${EXECUTABLE_PATH}`);
  } else {
    // Try fallback paths
    const fallbacks = ["/usr/bin/chromium", "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable"];
    const found = fallbacks.find((p) => fs.existsSync(p));
    if (found) {
      fail(
        `PUPPETEER_EXECUTABLE_PATH="${EXECUTABLE_PATH}" not found, but "${found}" exists.`,
        new Error(`Set PUPPETEER_EXECUTABLE_PATH=${found} in your .env.production`)
      );
    } else {
      fail(`Chromium not found at ${EXECUTABLE_PATH} or any fallback path.`, new Error("Install chromium-browser: sudo apt-get install -y chromium-browser"));
    }
  }

  // Test 2: Browser launches
  console.log("\nTest 2: Browser launch");
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      executablePath: EXECUTABLE_PATH,
      args: LAUNCH_ARGS,
    });
    ok("Browser launched successfully");
  } catch (err) {
    fail("Browser failed to launch", err);
    console.error("\n  Aborting remaining tests — browser could not start.\n");
    printSummary();
    process.exit(1);
  }

  // Test 3: New page + setContent
  console.log("\nTest 3: Page creation and HTML rendering");
  let page;
  try {
    page = await browser.newPage();
    await page.setContent(
      "<html><body><h1>Pathbyte Test</h1><p>PDF generation test</p></body></html>",
      { waitUntil: "networkidle0" }
    );
    ok("Page created and HTML content set");
  } catch (err) {
    fail("Failed to create page or set content", err);
  }

  // Test 4: Plain PDF generation (matches non-letterpad path in generatePdf.ts)
  console.log("\nTest 4: Plain A4 PDF generation");
  try {
    await page.addStyleTag({
      content: "body { padding: 0 !important; margin: 0 !important; background: white !important; }",
    });
    const pdfBuffer = Buffer.from(
      await page.pdf({
        format: "A4",
        preferCSSPageSize: true,
        printBackground: true,
      })
    );

    if (pdfBuffer.length > 1000) {
      ok(`Plain PDF generated — ${(pdfBuffer.length / 1024).toFixed(1)} KB`);
    } else {
      fail("PDF buffer is suspiciously small", new Error(`Size: ${pdfBuffer.length} bytes`));
    }
  } catch (err) {
    fail("Plain PDF generation failed", err);
  }

  // Test 5: Letterpad PDF generation (matches letterpad path in generatePdf.ts)
  console.log("\nTest 5: Letterpad A4 PDF generation (with SVG header)");
  try {
    // Reload fresh page
    const lpPage = await browser.newPage();
    await lpPage.setContent(
      `<html><body style="font-family:sans-serif; padding:20px;">
        <h2>Lab Report</h2>
        <p>Patient: Test Patient</p>
        <table border="1" cellpadding="4" style="width:100%">
          <tr><th>Test</th><th>Result</th><th>Reference</th></tr>
          <tr><td>Hemoglobin</td><td>13.5 g/dL</td><td>12-16 g/dL</td></tr>
        </table>
      </body></html>`,
      { waitUntil: "networkidle0" }
    );

    // Try to load the actual SVG asset (same path as generatePdf.ts uses at runtime)
    const svgPath = path.join(
      process.cwd(),
      "dist",
      "libs",
      "templates",
      "assets",
      "Lab Pad (1) (1).svg"
    );
    // Also try src path (for running before build)
    const svgPathSrc = path.join(
      process.cwd(),
      "src",
      "libs",
      "templates",
      "assets",
      "Lab Pad (1) (1).svg"
    );

    let svgBase64 = "";
    const svgActualPath = fs.existsSync(svgPath) ? svgPath : fs.existsSync(svgPathSrc) ? svgPathSrc : null;

    if (svgActualPath) {
      let svgData = fs.readFileSync(svgActualPath, "utf8");
      svgData = svgData.replace(/<path [^>]*fill="#FDFDFD"[^>]*\/>/, "");
      svgBase64 = `data:image/svg+xml;base64,${Buffer.from(svgData).toString("base64")}`;
      ok(`SVG letterpad asset loaded from: ${svgActualPath}`);
    } else {
      console.warn(`  ⚠️  SVG asset not found at expected paths — testing PDF without background`);
    }

    await lpPage.addStyleTag({
      content: `html, body { margin: 0 !important; padding: 0 !important; background: transparent !important; }`,
    });

    const headerHtml = svgBase64
      ? `<div style="position:absolute; top:0; left:0; width:210mm; height:297mm; z-index:-1;">` +
        `<img src="${svgBase64}" style="width:210mm; height:297mm; display:block;"/>` +
        `</div>`
      : "<div></div>";

    const pdfBuffer = Buffer.from(
      await lpPage.pdf({
        format: "A4",
        printBackground: true,
        displayHeaderFooter: true,
        margin: { top: "130px", bottom: "100px", left: "28px", right: "28px" },
        headerTemplate: headerHtml,
        footerTemplate: "<div></div>",
      })
    );

    await lpPage.close();

    if (pdfBuffer.length > 1000) {
      ok(`Letterpad PDF generated — ${(pdfBuffer.length / 1024).toFixed(1)} KB`);
    } else {
      fail("Letterpad PDF buffer is suspiciously small", new Error(`Size: ${pdfBuffer.length} bytes`));
    }
  } catch (err) {
    fail("Letterpad PDF generation failed", err);
  }

  // Test 6: Browser closes cleanly
  console.log("\nTest 6: Browser cleanup");
  try {
    await browser.close();
    ok("Browser closed cleanly — no zombie processes");
  } catch (err) {
    fail("Browser did not close cleanly", err);
  }

  // Test 7: Environment variable check
  console.log("\nTest 7: Required environment variables");
  const required = [
    "DATABASE_URL",
    "JWT_ACCESS_SECRET",
    "JWT_REFRESH_SECRET",
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "S3_BUCKET_NAME",
    "PUPPETEER_EXECUTABLE_PATH",
  ];
  const optional = ["accessToken", "phoneNumberId", "PORT"];

  for (const key of required) {
    if (process.env[key]) {
      ok(`${key} is set`);
    } else {
      fail(`${key} is NOT set — required for production`);
    }
  }
  for (const key of optional) {
    if (process.env[key]) {
      ok(`${key} is set (optional)`);
    } else {
      console.warn(`  ⚠️  ${key} is not set (optional — WhatsApp features will not work)`);
    }
  }

  printSummary();
}

function printSummary() {
  console.log("\n==============================================");
  console.log(` Results: ${passed} passed, ${failed} failed`);
  console.log("==============================================\n");
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Unexpected error during tests:", err);
  process.exit(1);
});
