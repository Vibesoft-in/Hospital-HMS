import { Router } from "express";
import hospitalPatientRouter from "@src/modules/hospital-patient/routes/hospital-patient.routes";
import hospitalDoctorRouter from "@src/modules/hospital-doctor/routes/hospital-doctor.routes";
import hospitalProcedureRouter from "@src/modules/hospital-procedure/routes/hospital-procedure.routes";
import hospitalVisitRouter from "@src/modules/hospital-visit/routes/hospital-visit.routes";
import hospitalTransactionRouter from "@src/modules/hospital-transaction/routes/hospital-transaction.routes";
import hospitalPharmaTokenRouter from "@src/modules/hospital-pharma-token/routes/hospital-pharma-token.routes";
import hospitalDialysisSessionRouter from "@src/modules/hospital-dialysis-session/routes";
import hospitalXraySessionRouter from "@src/modules/hospital-xray-session/routes/index";
import hospitalDashboardRouter from "@src/modules/hospital-dashboard/routes/hospital-dashboard.routes";
import constantsRouter from "@src/modules/constants/routes/constants.routes";
import hospitalAuthRouter from "@src/modules/hospital-auth/routes/hospital-auth.routes";
import hospitalUserRouter from "@src/modules/hospital-auth/routes/hospital-user.routes";
import daycareAppointmentRouter from "@src/modules/hospital-daycare-appointment/routes/daycare-appointment.routes";
import whatsappLogRouter from "@src/modules/whatsapp-log/routes/whatsapp-log.routes";
import wardRouter from "@src/modules/hospital-ward/routes/index";
import bedRouter from "@src/modules/hospital-bed/routes/index";
import procedurePackageRouter from "@src/modules/hospital-procedure-package/routes/index";
import ipdRouter from "@src/modules/hospital-ipd/routes/index";
import icdRouter from "@src/modules/icd/icd.routes";
import medicineRouter from "@src/modules/medicine/medicine.routes";
import masterExportRouter from "@src/modules/hospital-master-export/hospital-master-export.routes";

const router = Router();

// Hospital auth routes (public)
router.use("/auth", hospitalAuthRouter);

// Hospital user management routes (admin only)
router.use("/users", hospitalUserRouter);

// Hospital dashboard routes
router.use("/dashboard", hospitalDashboardRouter);

// Hospital module routes
router.use("/patients", hospitalPatientRouter);
router.use("/doctors", hospitalDoctorRouter);
router.use("/procedures", hospitalProcedureRouter);
router.use("/visits", hospitalVisitRouter);
router.use("/daycare-appointments", daycareAppointmentRouter);
router.use("/transactions", hospitalTransactionRouter);
router.use("/pharma-tokens", hospitalPharmaTokenRouter);
router.use("/", hospitalDialysisSessionRouter);
router.use("/", hospitalXraySessionRouter);
router.use("/constants", constantsRouter);
router.use("/whatsapp-logs", whatsappLogRouter);

// IPD & bed management routes
router.use("/wards", wardRouter);
router.use("/beds", bedRouter);
router.use("/procedure-packages", procedurePackageRouter);
router.use("/ipd", ipdRouter);

// ICD-11 diagnosis search
router.use("/icd", icdRouter);

// Medicine search & import
router.use("/medicines", medicineRouter);

// Master export (detailed + summarized across OPD / Daycare / IPD)
router.use("/master-export", masterExportRouter);

export default router;
