process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "d8f764a78b5e28a9b6c0e812d45f928e1b3c4a5f6e7d8c9b0a1e2f3a4b5c6d7e";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a";

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import express from "express";
import bcrypt from "bcryptjs";
import expressLoader from "@src/loaders/expressLoader";
import HospitalUserModel from "@src/modules/hospital-auth/models/hospital-user.model";
import HospitalPatientModel from "@src/modules/hospital-patient/models/hospital-patient.model";

describe("Patient ABHA Search ReDoS Prevention", () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;
  let authToken: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    app = express();
    await expressLoader({ app });

    // Seed a receptionist user
    const passwordHash = await bcrypt.hash("Password123!", 10);
    await HospitalUserModel.create({
      userId: "HUS_REC_001",
      username: "receptionist_user",
      email: "receptionist@hospital.com",
      passwordHash,
      name: "Frontdesk Receptionist",
      phoneNumber: "9876543210",
      role: "RECEPTIONIST",
      isActive: true,
      deleted: false,
    });

    // Seed patients with varying ABHA addresses, including a potential ReDoS target string
    await HospitalPatientModel.create([
      {
        mrd: "MRD_ABHA_001",
        name: "Abha Patient One",
        phone: "9876543211",
        gender: "Male",
        title: "Mr.",
        abhaAddress: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa!",
      },
      {
        mrd: "MRD_ABHA_002",
        name: "Abha Patient Two",
        phone: "9876543212",
        gender: "Female",
        title: "Ms.",
        abhaAddress: "user.sample@abdm",
        abhaNumber: "12-3456-7890-1234",
      },
      {
        mrd: "MRD_ABHA_003",
        name: "Literal ReDoS Pattern Patient",
        phone: "9876543213",
        gender: "Other",
        title: "Mr.",
        abhaAddress: "(a+)+$",
      },
    ]);

    // Log in to obtain Bearer token
    const loginRes = await request(app)
      .post("/api/v1/hospital/auth/login")
      .send({
        email: "receptionist@hospital.com",
        password: "Password123!",
      });

    expect(loginRes.status).toBe(200);
    authToken = loginRes.body.data.accessToken;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("handles ReDoS payload (a+)+$ quickly without catastrophic backtracking and returns 200 when exact literal matches", async () => {
    const redosPayload = "(a+)+$";
    const startTime = Date.now();

    const res = await request(app)
      .get(`/api/v1/hospital/patients/search/abha`)
      .set("Authorization", `Bearer ${authToken}`)
      .query({ abhaAddress: redosPayload });

    const elapsedMs = Date.now() - startTime;

    // Must return fast (< 1000ms), avoiding ReDoS
    expect(elapsedMs).toBeLessThan(1000);
    expect(res.status).toBe(200);
    expect(res.body.data?.patient?.mrd).toBe("MRD_ABHA_003");
    expect(res.body.data?.patient?.abhaAddress).toBe("(a+)+$");
  });

  it("handles complex ReDoS payloads like ((a+)+)+$ quickly and returns 404 when no match", async () => {
    const complexRedosPayload = "((a+)+)+$";
    const startTime = Date.now();

    const res = await request(app)
      .get(`/api/v1/hospital/patients/search/abha`)
      .set("Authorization", `Bearer ${authToken}`)
      .query({ abhaAddress: complexRedosPayload });

    const elapsedMs = Date.now() - startTime;

    expect(elapsedMs).toBeLessThan(1000);
    expect(res.status).toBe(404);
  });

  it("finds patient by normal abhaAddress case-insensitively", async () => {
    const res = await request(app)
      .get(`/api/v1/hospital/patients/search/abha`)
      .set("Authorization", `Bearer ${authToken}`)
      .query({ abhaAddress: "USER.SAMPLE@ABDM" });

    expect(res.status).toBe(200);
    expect(res.body.data?.patient?.mrd).toBe("MRD_ABHA_002");
  });
});
