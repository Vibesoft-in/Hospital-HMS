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
import { verifyAccessToken } from "@src/libs/jwt";

describe("Hospital Auth Refresh & Token Revocation", () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    app = express();
    await expressLoader({ app });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await HospitalUserModel.deleteMany({});
  });

  it("successfully refreshes token and signs new accessToken with current DB role", async () => {
    const passwordHash = await bcrypt.hash("Password123!", 10);
    const user = await HospitalUserModel.create({
      userId: "HUS_REF_001",
      username: "ref_user",
      email: "ref@hospital.com",
      passwordHash,
      name: "Refresh User",
      role: "RECEPTIONIST",
      tokenVersion: 0,
      isActive: true,
      deleted: false,
    });

    const loginRes = await request(app)
      .post("/api/v1/hospital/auth/login")
      .send({ email: "ref@hospital.com", password: "Password123!" });

    expect(loginRes.status).toBe(200);
    const cookie = loginRes.headers["set-cookie"];
    expect(cookie).toBeDefined();

    const refreshRes = await request(app)
      .post("/api/v1/hospital/auth/refresh")
      .set("Cookie", cookie);

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.data?.accessToken).toBeDefined();

    const decoded: any = verifyAccessToken(refreshRes.body.data.accessToken);
    expect(decoded.sub).toBe(user.userId);
    expect(decoded.role).toBe("RECEPTIONIST");
  });

  it("returns 401 when user no longer exists", async () => {
    const passwordHash = await bcrypt.hash("Password123!", 10);
    await HospitalUserModel.create({
      userId: "HUS_REF_002",
      username: "ref_user2",
      email: "ref2@hospital.com",
      passwordHash,
      name: "Refresh User 2",
      role: "RECEPTIONIST",
      tokenVersion: 0,
      isActive: true,
      deleted: false,
    });

    const loginRes = await request(app)
      .post("/api/v1/hospital/auth/login")
      .send({ email: "ref2@hospital.com", password: "Password123!" });

    const cookie = loginRes.headers["set-cookie"];

    // Delete user
    await HospitalUserModel.deleteOne({ userId: "HUS_REF_002" });

    const refreshRes = await request(app)
      .post("/api/v1/hospital/auth/refresh")
      .set("Cookie", cookie);

    expect(refreshRes.status).toBe(401);
    expect(refreshRes.body.message).toMatch(/no longer exists/i);
  });

  it("returns 401 when user isActive is false", async () => {
    const passwordHash = await bcrypt.hash("Password123!", 10);
    await HospitalUserModel.create({
      userId: "HUS_REF_003",
      username: "ref_user3",
      email: "ref3@hospital.com",
      passwordHash,
      name: "Refresh User 3",
      role: "RECEPTIONIST",
      tokenVersion: 0,
      isActive: true,
      deleted: false,
    });

    const loginRes = await request(app)
      .post("/api/v1/hospital/auth/login")
      .send({ email: "ref3@hospital.com", password: "Password123!" });

    const cookie = loginRes.headers["set-cookie"];

    // Deactivate user in DB
    await HospitalUserModel.updateOne({ userId: "HUS_REF_003" }, { isActive: false });

    const refreshRes = await request(app)
      .post("/api/v1/hospital/auth/refresh")
      .set("Cookie", cookie);

    expect(refreshRes.status).toBe(401);
    expect(refreshRes.body.message).toMatch(/inactive/i);
  });

  it("returns 401 when current DB role differs from token's role", async () => {
    const passwordHash = await bcrypt.hash("Password123!", 10);
    await HospitalUserModel.create({
      userId: "HUS_REF_004",
      username: "ref_user4",
      email: "ref4@hospital.com",
      passwordHash,
      name: "Refresh User 4",
      role: "RECEPTIONIST",
      tokenVersion: 0,
      isActive: true,
      deleted: false,
    });

    const loginRes = await request(app)
      .post("/api/v1/hospital/auth/login")
      .send({ email: "ref4@hospital.com", password: "Password123!" });

    const cookie = loginRes.headers["set-cookie"];

    // Change role in DB to ADMIN
    await HospitalUserModel.updateOne({ userId: "HUS_REF_004" }, { role: "ADMIN" });

    const refreshRes = await request(app)
      .post("/api/v1/hospital/auth/refresh")
      .set("Cookie", cookie);

    expect(refreshRes.status).toBe(401);
    expect(refreshRes.body.message).toMatch(/role has changed/i);
  });

  it("revokes refresh token when password is changed", async () => {
    const passwordHash = await bcrypt.hash("Password123!", 10);
    await HospitalUserModel.create({
      userId: "HUS_REF_005",
      username: "ref_user5",
      email: "ref5@hospital.com",
      passwordHash,
      name: "Refresh User 5",
      role: "ADMIN",
      tokenVersion: 0,
      isActive: true,
      deleted: false,
    });

    const loginRes = await request(app)
      .post("/api/v1/hospital/auth/login")
      .send({ email: "ref5@hospital.com", password: "Password123!" });

    const cookie = loginRes.headers["set-cookie"];
    const accessToken = loginRes.body.data.accessToken;

    // Change password via API
    const changeRes = await request(app)
      .post("/api/v1/hospital/auth/me/change-password")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        currentPassword: "Password123!",
        newPassword: "NewPassword123!",
      });

    expect(changeRes.status).toBe(200);

    // Old refresh token must now be rejected
    const refreshRes = await request(app)
      .post("/api/v1/hospital/auth/refresh")
      .set("Cookie", cookie);

    expect(refreshRes.status).toBe(401);
    expect(refreshRes.body.message).toMatch(/revoked/i);
  });

  it("revokes refresh token on logout", async () => {
    const passwordHash = await bcrypt.hash("Password123!", 10);
    await HospitalUserModel.create({
      userId: "HUS_REF_006",
      username: "ref_user6",
      email: "ref6@hospital.com",
      passwordHash,
      name: "Refresh User 6",
      role: "RECEPTIONIST",
      tokenVersion: 0,
      isActive: true,
      deleted: false,
    });

    const loginRes = await request(app)
      .post("/api/v1/hospital/auth/login")
      .send({ email: "ref6@hospital.com", password: "Password123!" });

    const cookie = loginRes.headers["set-cookie"];

    // Logout
    const logoutRes = await request(app)
      .post("/api/v1/hospital/auth/logout")
      .set("Cookie", cookie);

    expect(logoutRes.status).toBe(200);

    // Attempt to refresh using the old refresh token
    const refreshRes = await request(app)
      .post("/api/v1/hospital/auth/refresh")
      .set("Cookie", cookie);

    expect(refreshRes.status).toBe(401);
    expect(refreshRes.body.message).toMatch(/revoked/i);
  });

  it("revokes refresh token on admin deactivation and maintains revocation after reactivation", async () => {
    const passwordHash = await bcrypt.hash("Password123!", 10);
    await HospitalUserModel.create({
      userId: "HUS_REF_ADMIN",
      username: "admin_user",
      email: "admin@hospital.com",
      passwordHash,
      name: "Admin User",
      role: "ADMIN",
      tokenVersion: 0,
      isActive: true,
      deleted: false,
    });

    const regularUser = await HospitalUserModel.create({
      userId: "HUS_REF_REG",
      username: "regular_user",
      email: "regular@hospital.com",
      passwordHash,
      name: "Regular User",
      role: "RECEPTIONIST",
      tokenVersion: 0,
      isActive: true,
      deleted: false,
    });

    // Login as admin
    const adminLogin = await request(app)
      .post("/api/v1/hospital/auth/login")
      .send({ email: "admin@hospital.com", password: "Password123!" });
    const adminToken = adminLogin.body.data.accessToken;

    // Login as regular user
    const regLogin = await request(app)
      .post("/api/v1/hospital/auth/login")
      .send({ email: "regular@hospital.com", password: "Password123!" });
    const regCookie = regLogin.headers["set-cookie"];

    // Admin deactivates regular user
    const deactRes = await request(app)
      .patch(`/api/v1/hospital/users/${(regularUser as any)._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ isActive: false });

    expect(deactRes.status).toBe(200);

    // Regular user refresh fails while inactive
    const refreshInactive = await request(app)
      .post("/api/v1/hospital/auth/refresh")
      .set("Cookie", regCookie);

    expect(refreshInactive.status).toBe(401);

    // Admin reactivates regular user
    const reactRes = await request(app)
      .patch(`/api/v1/hospital/users/${(regularUser as any)._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ isActive: true });

    expect(reactRes.status).toBe(200);

    // Old refresh token must STILL be rejected because tokenVersion was incremented on deactivation
    const refreshReactivated = await request(app)
      .post("/api/v1/hospital/auth/refresh")
      .set("Cookie", regCookie);

    expect(refreshReactivated.status).toBe(401);
    expect(refreshReactivated.body.message).toMatch(/revoked/i);
  });
});
