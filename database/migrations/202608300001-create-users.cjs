"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query("CREATE EXTENSION IF NOT EXISTS pgcrypto");
    await queryInterface.createTable("users", {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false, defaultValue: Sequelize.literal("gen_random_uuid()") },
      username: { type: Sequelize.STRING(100), allowNull: false },
      password_hash: { type: Sequelize.STRING(255), allowNull: false },
      role: { type: Sequelize.STRING(20), allowNull: false, defaultValue: "ADMIN" },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") }
    });
    await queryInterface.addConstraint("users", {
      fields: ["role"], type: "check", name: "users_role_check", where: { role: ["ADMIN"] }
    });
    await queryInterface.sequelize.query("CREATE UNIQUE INDEX users_username_lower_unique ON users (LOWER(username))");
  },
  async down(queryInterface) {
    await queryInterface.dropTable("users");
  }
};

