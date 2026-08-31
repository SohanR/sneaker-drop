"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("socket_io_attachments", {
      id: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
      payload: { type: Sequelize.BLOB, allowNull: true }
    });
    await queryInterface.addIndex("socket_io_attachments", ["created_at"], { name: "socket_io_attachments_created_at_idx" });
  },
  async down(queryInterface) {
    await queryInterface.dropTable("socket_io_attachments");
  }
};
