"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("drops", {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false, defaultValue: Sequelize.literal("gen_random_uuid()") },
      name: { type: Sequelize.STRING(150), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      image_url: { type: Sequelize.TEXT, allowNull: true },
      price: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      currency: { type: Sequelize.STRING(3), allowNull: false, defaultValue: "USD" },
      total_stock: { type: Sequelize.INTEGER, allowNull: false },
      available_stock: { type: Sequelize.INTEGER, allowNull: false },
      starts_at: { type: Sequelize.DATE, allowNull: false },
      stock_version: { type: Sequelize.BIGINT, allowNull: false, defaultValue: 0 },
      created_by: { type: Sequelize.UUID, allowNull: false, references: { model: "users", key: "id" }, onUpdate: "CASCADE", onDelete: "RESTRICT" },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("NOW()") }
    });
    await queryInterface.addConstraint("drops", { fields: ["price"], type: "check", name: "drops_price_check", where: { price: { [Sequelize.Op.gte]: 0 } } });
    await queryInterface.addConstraint("drops", { fields: ["total_stock"], type: "check", name: "drops_total_stock_check", where: { total_stock: { [Sequelize.Op.gte]: 0 } } });
    await queryInterface.addConstraint("drops", { fields: ["available_stock"], type: "check", name: "drops_available_stock_nonnegative_check", where: { available_stock: { [Sequelize.Op.gte]: 0 } } });
    await queryInterface.sequelize.query("ALTER TABLE drops ADD CONSTRAINT drops_available_stock_total_check CHECK (available_stock <= total_stock)");
    await queryInterface.addIndex("drops", ["starts_at"], { name: "drops_starts_at_idx" });
    await queryInterface.addIndex("drops", ["starts_at", "created_at"], { name: "drops_starts_at_created_at_idx" });
  },
  async down(queryInterface) {
    await queryInterface.dropTable("drops");
  }
};
