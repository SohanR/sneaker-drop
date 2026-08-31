import "./load-env.js";
import pg from "pg";
import { Sequelize } from "sequelize";

let database: Sequelize | undefined;

export function createDatabase(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) throw new Error("DATABASE_URL is required to connect to PostgreSQL");
  return new Sequelize(connectionString, {
    dialect: "postgres",
    dialectModule: pg,
    logging: process.env.DB_LOGGING === "true" ? console.log : false,
    pool: {
      max: Number(process.env.DB_POOL_MAX || 5),
      min: Number(process.env.DB_POOL_MIN || 0),
      idle: Number(process.env.DB_POOL_IDLE_MS || 10_000),
      acquire: Number(process.env.DB_POOL_ACQUIRE_MS || 20_000)
    },
    dialectOptions: process.env.DB_SSL === "false"
      ? {}
      : { ssl: { require: true, rejectUnauthorized: false } }
  });
}

export function getDatabase() {
  database ??= createDatabase();
  return database;
}
