/**
 * Auth service — JWT token generation and verification for staff/doctor users.
 * Patient access uses the preparation link flow (see services/patient-auth.ts).
 */
import jwt from "jsonwebtoken";
import { config } from "../lib/config";
import type { SafeUser } from "@workspace/db";

export interface StaffTokenPayload {
  sub: string;     // user id
  role: string;
  email: string;
  iat?: number;
  exp?: number;
}

export function signStaffToken(user: SafeUser): string {
  const payload: StaffTokenPayload = {
    sub: user.id,
    role: user.role,
    email: user.email,
  };
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

export function verifyStaffToken(token: string): StaffTokenPayload {
  return jwt.verify(token, config.JWT_SECRET) as StaffTokenPayload;
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId, type: "refresh" }, config.JWT_SECRET, {
    expiresIn: config.REFRESH_TOKEN_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

export function verifyRefreshToken(token: string): { sub: string } {
  const payload = jwt.verify(token, config.JWT_SECRET) as { sub: string; type: string };
  if (payload.type !== "refresh") throw new Error("Invalid token type");
  return { sub: payload.sub };
}
