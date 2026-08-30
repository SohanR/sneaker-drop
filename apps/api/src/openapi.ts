export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "Sneaker Drop API",
    version: "0.1.0",
    description: "HTTP API for the limited-edition sneaker drop platform."
  },
  servers: [{ url: "/api/v1" }],
  paths: {
    "/health": {
      get: {
        summary: "Check API liveness",
        responses: { "200": { description: "API is running" } }
      }
    }
  }
} as const;

