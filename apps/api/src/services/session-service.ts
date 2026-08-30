import { createHash, randomBytes } from "node:crypto";
import { Op } from "sequelize";
import { getAuthConfig } from "../config/auth.js";
import { getModels } from "../database/models.js";
import { AppError } from "../errors/app-error.js";

function tokenHash(token: string) {
  return createHash("sha256").update(`${token}.${getAuthConfig().sessionTokenPepper}`).digest("hex");
}

export async function createBuyerSession(displayUsername: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + getAuthConfig().sessionTtlSeconds * 1000);
  const session = await getModels().BuyerSession.create({
    displayUsername,
    sessionTokenHash: tokenHash(token),
    expiresAt
  });
  return { token, session };
}

export async function findActiveBuyerSession(token: string) {
  const session = await getModels().BuyerSession.findOne({
    where: {
      sessionTokenHash: tokenHash(token),
      expiresAt: { [Op.gt]: new Date() }
    }
  });
  if (!session) throw new AppError(401, "BUYER_SESSION_INVALID", "Buyer session is missing or expired");
  await session.update({ lastSeenAt: new Date() }, { silent: true });
  return session;
}

