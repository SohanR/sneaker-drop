function value(name: string, developmentFallback: string) {
  const configured = process.env[name]?.trim();
  if (configured) {
    if (process.env.NODE_ENV === "production" && configured.length < 32) {
      throw new Error(name + " must be at least 32 characters in production");
    }
    return configured;
  }
  if (process.env.NODE_ENV === "production") throw new Error(`${name} is required in production`);
  return developmentFallback;
}

export function getAuthConfig() {
  return {
    sessionSecret: value("SESSION_SECRET", "development-only-session-secret-change-me"),
    sessionTokenPepper: value("SESSION_TOKEN_PEPPER", "development-only-token-pepper-change-me"),
    adminJwtSecret: value("ADMIN_JWT_SECRET", "development-only-jwt-secret-change-me"),
    adminJwtIssuer: process.env.ADMIN_JWT_ISSUER?.trim() || "sneaker-drop-api",
    adminJwtAudience: process.env.ADMIN_JWT_AUDIENCE?.trim() || "sneaker-drop-admin",
    adminJwtExpiresInSeconds: Number(process.env.ADMIN_JWT_EXPIRES_IN_SECONDS || 900),
    sessionTtlSeconds: Number(process.env.SESSION_TTL_SECONDS || 604800),
    sessionCookieName: process.env.SESSION_COOKIE_NAME?.trim() || "sneaker_drop_session"
  };
}
