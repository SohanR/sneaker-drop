import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { fn, col, where } from "sequelize";
import { getAuthConfig } from "../config/auth.js";
import { getModels } from "../database/models.js";
import { AppError } from "../errors/app-error.js";

export interface AdminClaims extends jwt.JwtPayload {
  sub: string;
  role: "ADMIN";
}

export async function loginAdmin(username: string, password: string) {
  const user = await getModels().User.findOne({ where: where(fn("LOWER", col("username")), username.toLowerCase()) });
  if (!user || !user.isActive || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid username or password");
  }
  const config = getAuthConfig();
  const token = jwt.sign({ role: "ADMIN" }, config.adminJwtSecret, {
    subject: user.id,
    issuer: config.adminJwtIssuer,
    audience: config.adminJwtAudience,
    expiresIn: config.adminJwtExpiresInSeconds
  });
  return { token, expiresIn: config.adminJwtExpiresInSeconds };
}

export function verifyAdminToken(token: string): AdminClaims {
  const config = getAuthConfig();
  try {
    const claims = jwt.verify(token, config.adminJwtSecret, {
      issuer: config.adminJwtIssuer,
      audience: config.adminJwtAudience
    });
    if (typeof claims === "string" || claims.role !== "ADMIN" || !claims.sub) throw new Error("Invalid claims");
    return claims as AdminClaims;
  } catch {
    throw new AppError(401, "ADMIN_TOKEN_INVALID", "Admin token is missing, invalid, or expired");
  }
}

