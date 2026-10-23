import { APIError } from "@src/shared";
import { CreateUserDTO, UpdateUserDTO, ResetPasswordDTO } from "../dtos/hospital-auth.dto";
import HospitalUserModel from "../models/hospital-user.model";
import { hashPassword } from "@src/libs/password";
import { getNextSequence } from "@src/libs/counter";

class HospitalUserService {
  async createUser(input: CreateUserDTO) {
    const userIdNum = await getNextSequence("hospitalUserId");
    const userId = `HUS${String(userIdNum).padStart(5, "0")}`;
    
    // Auto-generate username from email if not provided
    const username = input.username || input.email.split("@")[0];
    
    const user = await HospitalUserModel.createUser({
      email: input.email,
      username,
      passwordHash: await hashPassword(input.password),
      name: input.name,
      phoneNumber: input.phoneNumber,
      role: input.role,
      linkedDoctorId: input.linkedDoctorId || undefined,
      isActive: true,
      userId,
      deleted: false,
    });
    
    // Remove passwordHash from response
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async getUsers(skip: number = 0, limit: number = 50, searchQuery?: string) {
    const filter = { deleted: { $ne: true } };
    
    const search = searchQuery
      ? {
          $or: [
            { email: { $regex: searchQuery, $options: "i" } },
            { name: { $regex: searchQuery, $options: "i" } },
            { username: { $regex: searchQuery, $options: "i" } },
            { userId: { $regex: searchQuery, $options: "i" } },
          ],
        }
      : null;
    
    const result = await HospitalUserModel.readUsers(filter, search, skip, limit);
    
    return {
      users: result[0]?.data || [],
      total: result[0]?.totalCount[0]?.count || 0,
    };
  }

  async getUserById(id: string) {
    const user = await HospitalUserModel.readUser(id);
    
    if (!user) {
      throw new APIError(404, "User Not Found", `Hospital user with ID '${id}' not found.`);
    }
    
    return user;
  }

  async updateUser(id: string, updates: UpdateUserDTO) {
    // Check if email is being changed and if it's already taken
    if (updates.email) {
      const existing = await HospitalUserModel.findOne({
        email: updates.email,
        _id: { $ne: id },
        deleted: { $ne: true },
      });
      if (existing) {
        throw new APIError(409, "Email Already Exists", `Email '${updates.email}' is already registered.`);
      }
    }

    // Hash password if provided, then remove it from the updates object
    const { password, ...rest } = updates;
    const patch: any = { ...rest };
    if (password) {
      patch.passwordHash = await hashPassword(password);
    }

    const user = await HospitalUserModel.updateUser(id, patch);

    if (!user) {
      throw new APIError(404, "User Not Found", `Hospital user with ID '${id}' not found.`);
    }

    // If this user is a DOCTOR and email changed, sync to the linked HospitalDoctor document
    if ((user as any).linkedDoctorId && updates.email) {
      try {
        const HospitalDoctorModel = (await import("@src/modules/hospital-doctor/models/hospital-doctor.model")).default;
        await HospitalDoctorModel.findByIdAndUpdate(
          (user as any).linkedDoctorId,
          { $set: { email: updates.email } }
        );
      } catch (err) {
        console.warn(`[UserUpdate] Failed to sync email to linked doctor: ${err}`);
      }
    }    return user;
  }

  async deleteUser(id: string) {
    await HospitalUserModel.softDeleteUser(id);
  }

  /**
   * Pre-check: verify email is not already taken before doctor creation.
   * Throws APIError if duplicate found.
   */
  async checkEmailAvailable(email: string): Promise<void> {
    const existing = await HospitalUserModel.findOne({
      email: email.toLowerCase().trim(),
      deleted: { $ne: true },
    });
    if (existing) {
      throw new APIError(409, "Email Already Exists", `Email '${email}' is already registered in the hospital system.`);
    }
  }

  /**
   * Create a DOCTOR user linked to a HospitalDoctor document.
   * Called after doctor is successfully created.
   */
  async createDoctorUser(email: string, password: string, name: string, linkedDoctorId: string) {
    const userIdNum = await getNextSequence("hospitalUserId");
    const userId = `HUS${String(userIdNum).padStart(5, "0")}`;
    const username = email.split("@")[0];

    const user = await HospitalUserModel.createUser({
      email,
      username,
      passwordHash: await hashPassword(password),
      name,
      role: "DOCTOR",
      linkedDoctorId,
      isActive: true,
      userId,
      deleted: false,
    });

    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Sync email/password on the user linked to a doctor.
   * Called after doctor update if email or password changed.
   */
  async syncDoctorUser(linkedDoctorId: string, updates: { email?: string; password?: string }) {
    const user = await HospitalUserModel.findOne({ linkedDoctorId, deleted: { $ne: true } });
    if (!user) {
      // No linked user — log and skip, don't fail the doctor update
      console.warn(`[syncDoctorUser] No user found linked to doctorId: ${linkedDoctorId}`);
      return;
    }

    const patch: Record<string, any> = {};
    if (updates.email) patch.email = updates.email.toLowerCase().trim();
    if (updates.password) patch.passwordHash = await hashPassword(updates.password);

    if (Object.keys(patch).length > 0) {
      await HospitalUserModel.findOneAndUpdate(
        { _id: user._id },
        { $set: patch },
        { new: true }
      );
    }
  }

  async resetPassword(id: string, input: ResetPasswordDTO) {
    const user = await HospitalUserModel.findOne({ _id: id, deleted: { $ne: true } }).exec();
    
    if (!user) {
      throw new APIError(404, "User Not Found", `Hospital user with ID '${id}' not found.`);
    }
    
    user.passwordHash = await hashPassword(input.newPassword);
    await user.save();
    
    const { passwordHash, ...userWithoutPassword } = user.toObject();
    return userWithoutPassword;
  }
}

export default new HospitalUserService();
