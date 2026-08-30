"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("buyer_sessions", {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false, defaultValue: Sequelize.literal("gen_random_uuid()") },
      display_username: { type: Sequelize.STRING(50), allowNull: false },
      session_token_hash: { type: Sequelize.STRING(255), allowNull: false, unique: true },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      last_seen_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") }
    });
    await queryInterface.addConstraint("buyer_sessions", {
      fields: ["display_username"], type: "check", name: "buyer_sessions_display_username_check",
      where: { display_username: { [Sequelize.Op.regexp]: "^[A-Za-z0-9_.-]{3,50}$" } }
    });
    await queryInterface.addIndex("buyer_sessions", ["expires_at"], { name: "buyer_sessions_expires_at_idx" });
  },
  async down(queryInterface) {
    await queryInterface.dropTable("buyer_sessions");
  }
};

