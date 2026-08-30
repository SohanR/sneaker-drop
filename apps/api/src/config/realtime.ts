import "./load-env.js";

function secretValue() {
  const value = process.env.SOCKET_AUTH_SECRET?.trim();
  if (!value && process.env.NODE_ENV === "production") throw new Error("SOCKET_AUTH_SECRET is required in production");
  if (value && process.env.NODE_ENV === "production" && value.length < 32) {
    throw new Error("SOCKET_AUTH_SECRET must be at least 32 characters in production");
  }
  return value || "development-only-socket-secret-change-me";
}

export function getRealtimeConfig() {
  const expiresInSeconds = Number(process.env.SOCKET_TOKEN_EXPIRES_IN_SECONDS || 300);
  if (!Number.isInteger(expiresInSeconds) || expiresInSeconds <= 0) {
    throw new Error("SOCKET_TOKEN_EXPIRES_IN_SECONDS must be a positive integer");
  }
  return {
    secret: secretValue(),
    issuer: process.env.SOCKET_TOKEN_ISSUER?.trim() || "sneaker-drop-api",
    audience: process.env.SOCKET_TOKEN_AUDIENCE?.trim() || "sneaker-drop-socket",
    expiresInSeconds
  };
}
