const errorResponse = {
  description: "Request failed",
  content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } }
};

export const openApiV1Document = {
  openapi: "3.1.0",
  info: { title: "Sneaker Drop API", version: "0.4.0", description: "Inventory, buyer sessions, atomic reservations, and drop administration." },
  servers: [{ url: "/api/v1" }],
  components: {
    securitySchemes: {
      adminBearer: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      buyerCookie: { type: "apiKey", in: "cookie", name: "sneaker_drop_session" }
    },
    schemas: {
      ApiError: {
        type: "object", required: ["error"],
        properties: { error: { type: "object", required: ["code", "message", "requestId"], properties: {
          code: { type: "string" }, message: { type: "string" }, requestId: { type: "string" }, details: {}
        } } }
      },
      Drop: {
        type: "object", required: ["id", "name", "price", "currency", "totalStock", "availableStock", "startsAt", "stockVersion"],
        properties: {
          id: { type: "string", format: "uuid" }, name: { type: "string" }, description: { type: ["string", "null"] },
          imageUrl: { type: ["string", "null"], format: "uri" }, price: { type: "string", example: "199.99" },
          currency: { type: "string", example: "USD" }, totalStock: { type: "integer" }, availableStock: { type: "integer" },
          startsAt: { type: "string", format: "date-time" }, stockVersion: { type: "string" },
          serverTime: { type: "string", format: "date-time" }, recentPurchasers: { type: "array", maxItems: 3, items: { type: "object" } }
        }
      }
    }
  },
  paths: {
    "/health": { get: { summary: "Check API liveness", responses: { "200": { description: "API is running" } } } },
    "/sessions": {
      post: {
        summary: "Create an anonymous buyer session",
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["displayUsername"], properties: { displayUsername: { type: "string", example: "sneaker_fan" } } } } } },
        responses: { "201": { description: "Session created; signed HttpOnly cookie set" }, "422": errorResponse }
      }
    },
    "/sessions/current": { get: { summary: "Read the current buyer session", responses: { "200": { description: "Active session" }, "401": errorResponse } } },
    "/admin/login": {
      post: {
        summary: "Authenticate an administrator",
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["username", "password"], properties: { username: { type: "string", example: "admin" }, password: { type: "string", format: "password", example: "admin" } } } } } },
        responses: { "200": { description: "JWT issued" }, "401": errorResponse, "422": errorResponse }
      }
    },
    "/drops": {
      get: { summary: "List dashboard drops and recent purchasers", responses: { "200": { description: "Dashboard drop list" } } },
      post: {
        summary: "Create a merch drop", security: [{ adminBearer: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["name", "price", "totalStock", "startsAt"], properties: {
          name: { type: "string" }, description: { type: "string" }, imageUrl: { type: "string", format: "uri" }, price: { type: "number", minimum: 0 },
          currency: { type: "string", default: "USD" }, totalStock: { type: "integer", minimum: 0 }, startsAt: { type: "string", format: "date-time" }
        } } } } },
        responses: { "201": { description: "Drop created" }, "401": errorResponse, "422": errorResponse }
      }
    },
    "/drops/{dropId}/reservations": {
      post: {
        summary: "Reserve one unit for 60 seconds", security: [{ buyerCookie: [] }],
        parameters: [
          { name: "dropId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          { name: "Idempotency-Key", in: "header", required: true, schema: { type: "string", format: "uuid" } }
        ],
        responses: { "200": { description: "Idempotent replay" }, "201": { description: "Reservation created" }, "401": errorResponse, "404": errorResponse, "409": errorResponse, "422": errorResponse }
      }
    }
  }
} as const;
