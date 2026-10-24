process.env.NODE_ENV = "test";

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { sanitizeRichText } from "@src/libs/utils/sanitizeHtml";
import HospitalProcedureModel from "@src/modules/hospital-procedure/models/hospital-procedure.model";
import XraySessionModel from "@src/modules/hospital-xray-session/models/xray-session.model";

describe("Rich-Text Sanitization", () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe("sanitizeRichText utility function", () => {
    it("should strip <script> tags and any contents inside", () => {
      const input = '<p>Normal text</p><script>alert("XSS")</script><span>More text</span>';
      const output = sanitizeRichText(input);
      expect(output).not.toContain("<script");
      expect(output).not.toContain("alert");
      expect(output).toContain("<p>Normal text</p>");
      expect(output).toContain("<span>More text</span>");
    });

    it("should strip inline event handler attributes like onerror, onclick, onload", () => {
      const input = '<img src="valid.png" onerror="alert(1)" /><button onclick="fetch(\'/steal\')">Click</button>';
      const output = sanitizeRichText(input);
      expect(output).not.toContain("onerror");
      expect(output).not.toContain("onclick");
      expect(output).toContain('<img src="valid.png" />');
      expect(output).toContain('<button>Click</button>');
    });

    it("should strip javascript: URLs from href and src attributes", () => {
      const input = '<a href="javascript:alert(\'pwned\')">Download report</a><iframe src="javascript:void(0)"></iframe>';
      const output = sanitizeRichText(input);
      expect(output).not.toContain("javascript:");
      expect(output).not.toContain("<iframe");
    });

    it("should preserve valid rich text tags and tables", () => {
      const input = `
        <div class="report">
          <h2>Chest PA View</h2>
          <p><strong>Lungs:</strong> Bilateral lung fields are <em>clear</em>.</p>
          <table border="1">
            <thead>
              <tr><th>Finding</th><th>Result</th></tr>
            </thead>
            <tbody>
              <tr><td>Cardiothoracic Ratio</td><td>Normal (&lt; 0.5)</td></tr>
            </tbody>
          </table>
        </div>
      `;
      const output = sanitizeRichText(input);
      expect(output).toContain("<h2>Chest PA View</h2>");
      expect(output).toContain("<strong>Lungs:</strong>");
      expect(output).toContain("<em>clear</em>");
      expect(output).toContain("<table");
      expect(output).toContain("<td>Cardiothoracic Ratio</td>");
    });
  });

  describe("HospitalProcedure server-side sanitization", () => {
    it("should sanitize description and metaData during procedure creation and update", async () => {
      const created = await HospitalProcedureModel.createHospitalProcedure({
        procedureId: "PROC_TEST_001",
        procedureName: "Chest X-Ray PA View",
        department: "Radiology",
        category: "Imaging",
        price: 500,
        description: '<p>Standard procedure</p><script>window.location="http://evil.com"</script>',
        metaData: '<span onclick="evil()">Metadata info</span>',
      } as any);

      expect(created.description).not.toContain("<script");
      expect(created.description).not.toContain("evil.com");
      expect(created.description).toContain("<p>Standard procedure</p>");
      expect(created.metaData).not.toContain("onclick");
      expect(created.metaData).toContain("Metadata info");

      // Test update via model
      const updated = await HospitalProcedureModel.updateHospitalProcedure("PROC_TEST_001", {
        description: '<p>Updated description</p><img src="x" onerror="alert(2)">',
      });

      expect(updated.description).not.toContain("onerror");
      expect(updated.description).toContain("<p>Updated description</p>");
    });
  });

  describe("XraySession server-side sanitization", () => {
    it("should sanitize reportHtml, findings, and impression on save and findOneAndUpdate", async () => {
      const session = await XraySessionModel.createXraySession({
        sessionId: "XRAY_TEST_001",
        patientId: new mongoose.Types.ObjectId().toString(),
        findings: 'Normal bony thorax.<script>alert("hacked")</script>',
        impression: '<b onmouseover="stealCookie()">No acute cardiopulmonary disease.</b>',
        reportHtml: '<div class="report"><p>Official Report</p><a href="javascript:malicious()">Link</a></div>',
      } as any);

      expect(session.findings).not.toContain("<script");
      expect(session.findings).toContain("Normal bony thorax.");
      expect(session.impression).not.toContain("onmouseover");
      expect(session.impression).toContain("<b>No acute cardiopulmonary disease.</b>");
      expect(session.reportHtml).not.toContain("javascript:");
      expect(session.reportHtml).toContain("<p>Official Report</p>");

      // Test update
      const updated = await XraySessionModel.updateXraySession("XRAY_TEST_001", {
        reportHtml: '<div class="report"><img src="scan.jpg" onerror="pwn()" /><p>Updated</p></div>',
      });

      expect(updated.reportHtml).not.toContain("onerror");
      expect(updated.reportHtml).toContain('<img src="scan.jpg" />');
      expect(updated.reportHtml).toContain("<p>Updated</p>");
    });
  });
});
