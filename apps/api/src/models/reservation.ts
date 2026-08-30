import { DataTypes, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional, type Sequelize } from "sequelize";

export const RESERVATION_STATUSES = ["PENDING", "COMPLETED", "EXPIRED"] as const;
export type ReservationStatus = typeof RESERVATION_STATUSES[number];

export class Reservation extends Model<InferAttributes<Reservation>, InferCreationAttributes<Reservation>> {
  declare id: CreationOptional<string>;
  declare dropId: string;
  declare buyerSessionId: string;
  declare status: CreationOptional<ReservationStatus>;
  declare expiresAt: Date;
  declare completedAt: CreationOptional<Date | null>;
  declare expiredAt: CreationOptional<Date | null>;
  declare displayUsernameSnapshot: string;
  declare reservationIdempotencyKey: string;
  declare settlementIdempotencyKey: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initReservation(sequelize: Sequelize) {
  Reservation.init({
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    dropId: { type: DataTypes.UUID, allowNull: false },
    buyerSessionId: { type: DataTypes.UUID, allowNull: false },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "PENDING", validate: { isIn: [[...RESERVATION_STATUSES]] } },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
    completedAt: { type: DataTypes.DATE, allowNull: true },
    expiredAt: { type: DataTypes.DATE, allowNull: true },
    displayUsernameSnapshot: { type: DataTypes.STRING(50), allowNull: false },
    reservationIdempotencyKey: { type: DataTypes.UUID, allowNull: false },
    settlementIdempotencyKey: { type: DataTypes.UUID, allowNull: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE
  }, { sequelize, tableName: "reservations", underscored: true });
  return Reservation;
}
