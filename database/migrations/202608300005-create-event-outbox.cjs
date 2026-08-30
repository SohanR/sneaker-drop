"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("event_outbox", {
      id: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true, allowNull: false },
      event_id: { type: Sequelize.UUID, allowNull: false, defaultValue: Sequelize.literal("gen_random_uuid()"), unique: true },
      aggregate_type: { type: Sequelize.STRING(30), allowNull: false },
      aggregate_id: { type: Sequelize.UUID, allowNull: false },
      event_type: { type: Sequelize.STRING(80), allowNull: false },
      payload: { type: Sequelize.JSONB, allowNull: false },
      stock_version: { type: Sequelize.BIGINT, allowNull: true },
      occurred_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
      published_at: { type: Sequelize.DATE, allowNull: true },
      attempt_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      next_attempt_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
      last_error: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") }
    });
    await queryInterface.addConstraint("event_outbox", {
      fields: ["attempt_count"], type: "check", name: "event_outbox_attempt_count_check",
      where: { attempt_count: { [Sequelize.Op.gte]: 0 } }
    });
    await queryInterface.addIndex("event_outbox", ["published_at", "next_attempt_at", "id"], { name: "event_outbox_delivery_idx" });
    await queryInterface.addIndex("event_outbox", ["aggregate_id", "id"], { name: "event_outbox_aggregate_idx" });
  },
  async down(queryInterface) {
    await queryInterface.dropTable("event_outbox");
  }
};
