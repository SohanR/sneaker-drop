import jwt from "jsonwebtoken";
import { getSocketAuthConfig } from "./config/realtime.js";

export interface SocketIdentity {
  buyerSessionId: string;
}

export function verifySocketToken(token: unknown): SocketIdentity {
  if (typeof token !== "string" || !token) throw new Error("Realtime token is required");
  const config = getSocketAuthConfig();
  const claims = jwt.verify(token, config.secret, { issuer: config.issuer, audience: config.audience });
  if (typeof claims === "string" || claims.scope !== "realtime" || !claims.sub) throw new Error("Realtime token is invalid");
  return { buyerSessionId: claims.sub };
}

