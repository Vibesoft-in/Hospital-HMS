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
import HospitalDoctorModel from "@src/modules/hospital-doctor/models/hospital-doctor.model";
import HospitalPatientModel from "@src/modules/hospital-patient/models/hospital-patient.model";
import HospitalVisitModel from "@src/modules/hospital-visit/models/hospital-visit.model";
import DaycareAppointmentModel from "@src/modules/hospital-daycare-appointment/models/daycare-appointment.model";

describe("Doctor Ownership Filter Enforcement", () => {
  let mongoServer: MongoMemoryServer;
  let app: express.Application;
  let doctorAToken: string;
  let doctorAId: string;
  let doctorBId: string;
  let patientAId: string;
  let patientBId: string;
  let visitAId: string;
  let visitBId: string;
  let daycareAId: string;
  let daycareBId: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    app = express();
    await expressLoader({ app });

    // Seed Doctor A and Doctor B
    const docA = await HospitalDoctorModel.create({
      doctorId: "DOC_001",
      name: "Dr. Alice Smith",
      department: "General Medicine",
      email: "alice.doctor@hospital.com",
      phone: "1111111111",
      visitTypes: [{ visitType: "New", appointmentType: "OPD", charge: 500 }],
    });
    doctorAId = (docA as any)._id.toString();

    const docB = await HospitalDoctorModel.create({
      doctorId: "DOC_002",
      name: "Dr. Bob Jones",
      department: "General Medicine",
      email: "bob.doctor@hospital.com",
      phone: "2222222222",
      visitTypes: [{ visitType: "New", appointmentType: "OPD", charge: 600 }],
    });
    doctorBId = (docB as any)._id.toString();

    // Seed HospitalUser with role DOCTOR linked to docA
    const passwordHash = await bcrypt.hash("Password123!", 10);
    await HospitalUserModel.create({
      userId: "HUS_DOC_001",
      username: "doctor_alice",
      email: "alice@hospital.com",
      passwordHash,
      name: "Dr. Alice Smith",
      phoneNumber: "1111111111",
      role: "DOCTOR",
      linkedDoctorId: doctorAId,
      isActive: true,
      deleted: false,
    });

    // Seed Patients: patientA (linked to doctor A), patientB (linked to doctor B)
    const patientA = await HospitalPatientModel.create({
      mrd: "MRD0001",
      name: "Patient Linked to Doc A",
      phone: "9999999991",
      gender: "Male",
      title: "Mr.",
      doctorId: doctorAId,
    });
    patientAId = (patientA as any)._id.toString();

    const patientB = await HospitalPatientModel.create({
      mrd: "MRD0002",
      name: "Patient Linked to Doc B",
      phone: "9999999992",
      gender: "Female",
      title: "Mrs.",
      doctorId: doctorBId,
    });
    patientBId = (patientB as any)._id.toString();

    // Seed Visit linked to Doctor A
    const visitA = await HospitalVisitModel.create({
      visitId: "VIS00001",
      appointmentId: "APT00001",
      patientId: patientAId,
      doctorId: doctorAId,
      visitType: "New",
      appointmentType: "OPD",
      visitDate: new Date(),
      tokenNumber: 1,
      price: 500,
      totalPrice: 500,
      status: "Scheduled",
      isDeleted: false,
    });
    visitAId = (visitA as any)._id.toString();

    // Seed Visit linked to Doctor B
    const visitB = await HospitalVisitModel.create({
      visitId: "VIS00002",
      appointmentId: "APT00002",
      patientId: patientBId,
      doctorId: doctorBId,
      visitType: "New",
      appointmentType: "OPD",
      visitDate: new Date(),
      tokenNumber: 2,
      price: 600,
      totalPrice: 600,
      status: "Scheduled",
      isDeleted: false,
    });
    visitBId = (visitB as any)._id.toString();

    // Seed Daycare Appointment linked to Doctor A
    const daycareA = await DaycareAppointmentModel.create({
      daycareId: "DC00001",
      appointmentId: "DCA00001",
      patientId: patientAId,
      doctorId: doctorAId,
      appointmentDate: new Date(),
      status: "Scheduled",
      procedures: [],
      doctorVisitCharges: true,
      subtotal: 1000,
      totalPrice: 1000,
      isDeleted: false,
    });
    daycareAId = (daycareA as any)._id.toString();

    // Seed Daycare Appointment linked to Doctor B
    const daycareB = await DaycareAppointmentModel.create({
      daycareId: "DC00002",
      appointmentId: "DCA00002",
      patientId: patientBId,
      doctorId: doctorBId,
      appointmentDate: new Date(),
      status: "Scheduled",
      procedures: [],
      doctorVisitCharges: true,
      subtotal: 1200,
      totalPrice: 1200,
      isDeleted: false,
    });
    daycareBId = (daycareB as any)._id.toString();

    // Log in as Doctor A to obtain Bearer token
    const loginRes = await request(app)
      .post("/api/v1/hospital/auth/login")
      .send({
        email: "alice@hospital.com",
        password: "Password123!",
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data?.accessToken).toBeDefined();
    doctorAToken = loginRes.body.data.accessToken;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("returns 404 when DOCTOR user fetches a patient record not linked to them", async () => {
    const res = await request(app)
      .get(`/api/v1/hospital/patients/${patientBId}`)
      .set("Authorization", `Bearer ${doctorAToken}`);

    expect(res.status).toBe(404);
  });

  it("returns 200 when DOCTOR user fetches a patient record linked to them", async () => {
    const res = await request(app)
      .get(`/api/v1/hospital/patients/${patientAId}`)
      .set("Authorization", `Bearer ${doctorAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data?.patient?._id?.toString()).toBe(patientAId);
  });

  it("returns 404 when DOCTOR user fetches a visit record not linked to them", async () => {
    const res = await request(app)
      .get(`/api/v1/hospital/visits/${visitBId}`)
      .set("Authorization", `Bearer ${doctorAToken}`);

    expect(res.status).toBe(404);
  });

  it("returns 200 when DOCTOR user fetches a visit record linked to them", async () => {
    const res = await request(app)
      .get(`/api/v1/hospital/visits/${visitAId}`)
      .set("Authorization", `Bearer ${doctorAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data?.visit?._id?.toString()).toBe(visitAId);
  });

  it("returns 404 when DOCTOR user fetches a daycare appointment not linked to them", async () => {
    const res = await request(app)
      .get(`/api/v1/hospital/daycare-appointments/${daycareBId}`)
      .set("Authorization", `Bearer ${doctorAToken}`);

    expect(res.status).toBe(404);
  });

  it("returns 200 when DOCTOR user fetches a daycare appointment linked to them", async () => {
    const res = await request(app)
      .get(`/api/v1/hospital/daycare-appointments/${daycareAId}`)
      .set("Authorization", `Bearer ${doctorAToken}`);

    expect(res.status).toBe(200);
  });
});
