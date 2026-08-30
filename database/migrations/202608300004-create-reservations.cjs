"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("reservations", {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false, defaultValue: Sequelize.literal("gen_random_uuid()") },
      drop_id: { type: Sequelize.UUID, allowNull: false, references: { model: "drops", key: "id" }, onUpdate: "CASCADE", onDelete: "RESTRICT" },
      buyer_session_id: { type: Sequelize.UUID, allowNull: false, references: { model: "buyer_sessions", key: "id" }, onUpdate: "CASCADE", onDelete: "RESTRICT" },
      status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: "PENDING" },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      completed_at: { type: Sequelize.DATE, allowNull: true },
      expired_at: { type: Sequelize.DATE, allowNull: true },
      display_username_snapshot: { type: Sequelize.STRING(50), allowNull: false },
      reservation_idempotency_key: { type: Sequelize.UUID, allowNull: false },
      settlement_idempotency_key: { type: Sequelize.UUID, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") }
    });
    await queryInterface.addConstraint("reservations", {
      fields: ["status"], type: "check", name: "reservations_status_check",
      where: { status: ["PENDING", "COMPLETED", "EXPIRED"] }
    });
    await queryInterface.sequelize.query(`
      ALTER TABLE reservations ADD CONSTRAINT reservations_status_timestamps_check CHECK (
        (status = 'PENDING' AND completed_at IS NULL AND expired_at IS NULL) OR
        (status = 'COMPLETED' AND completed_at IS NOT NULL AND expired_at IS NULL) OR
        (status = 'EXPIRED' AND completed_at IS NULL AND expired_at IS NOT NULL)
      )
    `);
    await queryInterface.addIndex("reservations", ["buyer_session_id", "reservation_idempotency_key"], {
      unique: true, name: "reservations_buyer_reservation_idempotency_unique"
    });
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX reservations_settlement_idempotency_unique
      ON reservations (id, settlement_idempotency_key)
      WHERE settlement_idempotency_key IS NOT NULL
    `);
    await queryInterface.addIndex("reservations", ["status", "expires_at"], { name: "reservations_status_expires_at_idx" });
    await queryInterface.addIndex("reservations", ["drop_id", "status", { name: "completed_at", order: "DESC" }], { name: "reservations_drop_activity_idx" });
    await queryInterface.addIndex("reservations", ["buyer_session_id", "status"], { name: "reservations_buyer_status_idx" });
  },
  async down(queryInterface) {
    await queryInterface.dropTable("reservations");
  }
};

