import express from "express";
import hospitalUserController from "../controllers/hospital-user.controller";
import hospitalUsersController from "../controllers/hospital-users.controller";
import { requireHospitalAdmin } from "@src/middlewares/hospital-auth.middleware";

const router = express.Router();

const { createUser, getUser, updateUser, deleteUser, resetPassword } = hospitalUserController;
const { getUsers } = hospitalUsersController;

// All user management routes require ADMIN role
router.use(requireHospitalAdmin());

router.route("/")
  .get(getUsers)
  .post(createUser);

router.route("/:id")
  .get(getUser)
  .patch(updateUser)
  .delete(deleteUser);

router.post("/:id/reset-password", resetPassword);

export default router;
