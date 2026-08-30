import type { Sequelize } from "sequelize";
import { BuyerSession, initBuyerSession } from "./buyer-session.js";
import { Drop, initDrop } from "./drop.js";
import { EventOutbox, initEventOutbox } from "./event-outbox.js";
import { Reservation, initReservation } from "./reservation.js";
import { User, initUser } from "./user.js";

export function initializeModels(sequelize: Sequelize) {
  initUser(sequelize);
  initBuyerSession(sequelize);
  initDrop(sequelize);
  initReservation(sequelize);
  initEventOutbox(sequelize);
  User.hasMany(Drop, { foreignKey: "createdBy", as: "createdDrops" });
  Drop.belongsTo(User, { foreignKey: "createdBy", as: "creator" });
  Drop.hasMany(Reservation, { foreignKey: "dropId", as: "reservations" });
  Reservation.belongsTo(Drop, { foreignKey: "dropId", as: "drop" });
  BuyerSession.hasMany(Reservation, { foreignKey: "buyerSessionId", as: "reservations" });
  Reservation.belongsTo(BuyerSession, { foreignKey: "buyerSessionId", as: "buyerSession" });
  return { User, BuyerSession, Drop, Reservation, EventOutbox };
}

export { BuyerSession, Drop, EventOutbox, Reservation, User };
