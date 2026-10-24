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

describe("ACCOUNTANT Role-Based Access Control (RBAC)", () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;
  let accountantToken: string;
  let dummyId: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    app = express();
    await expressLoader({ app });

    // Seed an ACCOUNTANT user
    const passwordHash = await bcrypt.hash("Password123!", 10);
    await HospitalUserModel.create({
      userId: "HUS_ACC_001",
      username: "accountant_user",
      email: "accountant@hospital.com",
      passwordHash,
      name: "Hospital Accountant",
      phoneNumber: "9876543210",
      role: "ACCOUNTANT",
      isActive: true,
      deleted: false,
    });

    dummyId = new mongoose.Types.ObjectId().toString();

    // Log in as ACCOUNTANT to obtain accessToken
    const loginRes = await request(app)
      .post("/api/v1/hospital/auth/login")
      .send({
        email: "accountant@hospital.com",
        password: "Password123!",
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data?.accessToken).toBeDefined();
    accountantToken = loginRes.body.data.accessToken;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("asserts 403 when ACCOUNTANT attempts POST /api/v1/hospital/users", async () => {
    const res = await request(app)
      .post("/api/v1/hospital/users")
      .set("Authorization", `Bearer ${accountantToken}`)
      .send({
        email: "newuser@hospital.com",
        name: "New User",
        role: "RECEPTIONIST",
        password: "Password123!",
      });

    expect(res.status).toBe(403);
    expect(res.body.message || res.body.data?.error?.message).toMatch(/ADMIN role/i);
  });

  it("asserts 403 when ACCOUNTANT attempts PATCH /api/v1/hospital/users/:id", async () => {
    const res = await request(app)
      .patch(`/api/v1/hospital/users/${dummyId}`)
      .set("Authorization", `Bearer ${accountantToken}`)
      .send({
        name: "Unauthorized Update",
      });

    expect(res.status).toBe(403);
    expect(res.body.message || res.body.data?.error?.message).toMatch(/ADMIN role/i);
  });

  it("asserts 403 when ACCOUNTANT attempts DELETE /api/v1/hospital/users/:id", async () => {
    const res = await request(app)
      .delete(`/api/v1/hospital/users/${dummyId}`)
      .set("Authorization", `Bearer ${accountantToken}`);

    expect(res.status).toBe(403);
    expect(res.body.message || res.body.data?.error?.message).toMatch(/ADMIN role/i);
  });

  it("asserts 403 when ACCOUNTANT attempts PATCH /api/v1/hospital/transactions/:id", async () => {
    const res = await request(app)
      .patch(`/api/v1/hospital/transactions/${dummyId}`)
      .set("Authorization", `Bearer ${accountantToken}`)
      .send({
        notes: "Unauthorized Transaction Update",
      });

    expect(res.status).toBe(403);
    expect(res.body.message || res.body.data?.error?.message).toMatch(/ADMIN role/i);
  });

  it("asserts 403 when ACCOUNTANT attempts DELETE /api/v1/hospital/transactions/:id", async () => {
    const res = await request(app)
      .delete(`/api/v1/hospital/transactions/${dummyId}`)
      .set("Authorization", `Bearer ${accountantToken}`);

    expect(res.status).toBe(403);
    expect(res.body.message || res.body.data?.error?.message).toMatch(/ADMIN role/i);
  });

  it("asserts 403 when ACCOUNTANT attempts POST /api/v1/hospital/auth/me/change-password", async () => {
    const res = await request(app)
      .post("/api/v1/hospital/auth/me/change-password")
      .set("Authorization", `Bearer ${accountantToken}`)
      .send({
        currentPassword: "Password123!",
        newPassword: "NewPassword123!",
      });

    expect(res.status).toBe(403);
    expect(res.body.message || res.body.data?.error?.message).toMatch(/ADMIN role/i);
  });
});
