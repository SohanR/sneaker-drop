"use strict";

const bcrypt = require("bcryptjs");

module.exports = {
  async up(queryInterface) {
    const username = process.env.SEED_ADMIN_USERNAME || "admin";
    const password = process.env.SEED_ADMIN_PASSWORD || "admin";
    const environment = process.env.NODE_ENV || "development";
    if (environment === "production" && (username.toLowerCase() === "admin" || password === "admin")) {
      throw new Error("Production admin seed requires non-default SEED_ADMIN_USERNAME and SEED_ADMIN_PASSWORD");
    }

    const [existing] = await queryInterface.sequelize.query(
      "SELECT id FROM users WHERE LOWER(username) = LOWER(:username) LIMIT 1",
      { replacements: { username } }
    );
    if (existing.length > 0) return;

    const now = new Date();
    await queryInterface.bulkInsert("users", [{
      username,
      password_hash: await bcrypt.hash(password, Number(process.env.BCRYPT_ROUNDS || 12)),
      role: "ADMIN",
      is_active: true,
      created_at: now,
      updated_at: now
    }]);
  },

  async down(queryInterface) {
    const username = process.env.SEED_ADMIN_USERNAME || "admin";
    await queryInterface.sequelize.query(
      "DELETE FROM users WHERE LOWER(username) = LOWER(:username) AND role = 'ADMIN'",
      { replacements: { username } }
    );
  }
};

