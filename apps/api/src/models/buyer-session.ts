import { DataTypes, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional, type Sequelize } from "sequelize";

export class BuyerSession extends Model<InferAttributes<BuyerSession>, InferCreationAttributes<BuyerSession>> {
  declare id: CreationOptional<string>;
  declare displayUsername: string;
  declare sessionTokenHash: string;
  declare expiresAt: Date;
  declare lastSeenAt: CreationOptional<Date>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initBuyerSession(sequelize: Sequelize) {
  BuyerSession.init({
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    displayUsername: { type: DataTypes.STRING(50), allowNull: false, validate: { is: /^[A-Za-z0-9_.-]{3,50}$/ } },
    sessionTokenHash: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
    lastSeenAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE
  }, { sequelize, tableName: "buyer_sessions", underscored: true, indexes: [{ fields: ["expires_at"] }] });
  return BuyerSession;
}

