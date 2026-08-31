import { createRequire } from "node:module";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDatabase } from "./config/database.js";
import { initializeModels } from "./models/index.js";

const require = createRequire(import.meta.url);
const databaseDirectory = fileURLToPath(new URL("../../../database/", import.meta.url));

describe("database models", () => {
  it("initializes every model and required association without connecting", async () => {
    const sequelize = createDatabase("postgresql://user:password@localhost:5432/sneaker_drop");
    const models = initializeModels(sequelize);
    expect(Object.keys(sequelize.models).sort()).toEqual(["BuyerSession", "Drop", "EventOutbox", "Reservation", "User"]);
    expect(models.Drop.associations.creator?.target).toBe(models.User);
    expect(models.Reservation.associations.drop?.target).toBe(models.Drop);
    expect(models.Reservation.associations.buyerSession?.target).toBe(models.BuyerSession);
    expect(models.Drop.getAttributes().availableStock.field).toBe("available_stock");
    void sequelize;
  });
});

describe("database migrations", () => {
  it("contains an executable, reversible migration for every table", async () => {
    const files = readdirSync(`${databaseDirectory}/migrations`).sort();
    expect(files).toHaveLength(6);
    const createdTables: string[] = [];
    const droppedTables: string[] = [];
    const queryInterface = {
      createTable: vi.fn(async (table: string) => { createdTables.push(table); }),
      dropTable: vi.fn(async (table: string) => { droppedTables.push(table); }),
      addConstraint: vi.fn(async () => undefined),
      addIndex: vi.fn(async () => undefined),
      sequelize: { query: vi.fn(async () => [[], undefined]) }
    };
    const Sequelize = require("sequelize");

    for (const file of files) await require(`${databaseDirectory}/migrations/${file}`).up(queryInterface, Sequelize);
    for (const file of [...files].reverse()) await require(`${databaseDirectory}/migrations/${file}`).down(queryInterface, Sequelize);

    expect(createdTables).toEqual(["users", "buyer_sessions", "drops", "reservations", "event_outbox", "socket_io_attachments"]);
    expect(droppedTables).toEqual(["socket_io_attachments", "event_outbox", "reservations", "drops", "buyer_sessions", "users"]);
  });
});

describe("admin seed", () => {
  const originalEnvironment = { ...process.env };
  afterEach(() => {
    process.env = { ...originalEnvironment };
    vi.restoreAllMocks();
  });

  it("does not insert a duplicate administrator", async () => {
    process.env.NODE_ENV = "test";
    process.env.BCRYPT_ROUNDS = "4";
    const seed = require(`${databaseDirectory}/seeders/202608300001-admin-user.cjs`);
    const bulkInsert = vi.fn();
    const queryInterface = { sequelize: { query: vi.fn(async () => [[{ id: "existing" }]]) }, bulkInsert };
    await seed.up(queryInterface);
    expect(bulkInsert).not.toHaveBeenCalled();
  });

  it("rejects assessment credentials in production", async () => {
    process.env.NODE_ENV = "production";
    process.env.SEED_ADMIN_USERNAME = "admin";
    process.env.SEED_ADMIN_PASSWORD = "admin";
    const seed = require(`${databaseDirectory}/seeders/202608300001-admin-user.cjs`);
    await expect(seed.up({})).rejects.toThrow("Production admin seed requires non-default");
  });
});
