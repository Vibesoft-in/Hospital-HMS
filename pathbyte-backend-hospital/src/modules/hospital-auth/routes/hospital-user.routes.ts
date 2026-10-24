import express from "express";
import hospitalUserController from "../controllers/hospital-user.controller";
import hospitalUsersController from "../controllers/hospital-users.controller";
import { requireHospitalUser, requireHospitalAdminStrict } from "@src/middlewares/hospital-auth.middleware";

const router = express.Router();

const { createUser, getUser, updateUser, deleteUser, resetPassword } = hospitalUserController;
const { getUsers } = hospitalUsersController;

// All user management routes require authentication
router.use(requireHospitalUser());

router.route("/")
  .get(getUsers)
  .post(requireHospitalAdminStrict(), createUser);

router.route("/:id")
  .get(getUser)
  .patch(requireHospitalAdminStrict(), updateUser)
  .delete(requireHospitalAdminStrict(), deleteUser);

router.post("/:id/reset-password", requireHospitalAdminStrict(), resetPassword);

export default router;
