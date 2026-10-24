import jwt, { SignOptions } from "jsonwebtoken";
import { Types } from "mongoose";

// Base JWT payload for pathlab system
export type JwtPayload = { sub: string; roles: Types.ObjectId[] };

// Extended JWT payload for hospital system
export type HospitalJwtPayload = { sub: string; role: string; type: "hospital"; tokenVersion?: number };

// Union type for all JWT payloads
export type AnyJwtPayload = JwtPayload | HospitalJwtPayload;

export function signAccessToken(payload: AnyJwtPayload) {
  const options: SignOptions = { expiresIn: process.env.JWT_ACCESS_TTL as any || "15m"};
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET as string, options);
}

export function signRefreshToken(payload: AnyJwtPayload) {
  const options: SignOptions = { expiresIn: process.env.JWT_REFRESH_TTL as any || "7d" };
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET as string, options);
}

export function verifyAccessToken(token: string): AnyJwtPayload {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET as string, { algorithms: ["HS256"] }) as AnyJwtPayload;
}

export function verifyRefreshToken(token: string): AnyJwtPayload {
  return jwt.verify(
    token,
    process.env.JWT_REFRESH_SECRET as string,
    { algorithms: ["HS256"] }
  ) as AnyJwtPayload;
}
