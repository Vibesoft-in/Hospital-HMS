import { APIError } from "@src/shared";
import {
  LoginDTO,
  AuthUserDTO,
  ChangePasswordDTO,
} from "../dtos/hospital-auth.dto";
import HospitalUserModel from "../models/hospital-user.model";
import { hashPassword, comparePassword } from "@src/libs/password";
import { signAccessToken, signRefreshToken } from "@src/libs/jwt";

function toAuthUser(u: any): AuthUserDTO {
  const { _id, userId, username, email, name, phoneNumber, role, isActive, tokenVersion, createdAt, updatedAt } = u;
  return { _id, userId, username, email, name, phoneNumber, role, isActive, tokenVersion, createdAt, updatedAt };
}

class HospitalAuthService {
  async login(input: LoginDTO) {
    const user = await HospitalUserModel.readByEmail(input.email);
    
    if (!user || !user.isActive) {
      throw new APIError(401, "Unauthorized", "Invalid credentials.");
    }
    
    const ok = await comparePassword(input.password, user.passwordHash);
    if (!ok) {
      throw new APIError(401, "Unauthorized", "Invalid credentials.");
    }
    
    const payload = { 
      sub: user.userId, 
      role: user.role,
      type: "hospital" as const,
      tokenVersion: user.tokenVersion ?? 0,
    };
    
    return {
      user: toAuthUser(user),
      accessToken: signAccessToken(payload),
      refreshToken: signRefreshToken(payload),
    };
  }

  async changePassword(userId: string, input: ChangePasswordDTO) {
    const user = await HospitalUserModel.findOne({ _id: userId }).exec();
    
    if (!user) {
      throw new APIError(404, "User Not Found", "Cannot change password.");
    }
    
    const ok = await comparePassword(input.currentPassword, user.passwordHash);
    if (!ok) {
      throw new APIError(400, "Bad Request", "Current password incorrect.");
    }
    
    user.passwordHash = await hashPassword(input.newPassword);
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
    
    return toAuthUser(user.toObject());
  }
}

export default new HospitalAuthService();
