require("dotenv").config();

function databaseUrl() {
  const value = process.env.DATABASE_MIGRATION_URL || process.env.DATABASE_URL;
  if (!value) throw new Error("DATABASE_MIGRATION_URL or DATABASE_URL is required");
  return value;
}

function environmentConfig() {
  return {
    url: databaseUrl(),
    dialect: "postgres",
    migrationStorage: "sequelize",
    migrationStorageTableName: "sequelize_meta",
    logging: process.env.DB_LOGGING === "true" ? console.log : false,
    dialectOptions: process.env.DB_SSL === "false"
      ? {}
      : { ssl: { require: true, rejectUnauthorized: false } }
  };
}

module.exports = {
  development: environmentConfig(),
  test: environmentConfig(),
  production: environmentConfig()
};

