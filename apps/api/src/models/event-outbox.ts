import { DataTypes, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional, type Sequelize } from "sequelize";

export class EventOutbox extends Model<InferAttributes<EventOutbox>, InferCreationAttributes<EventOutbox>> {
  declare id: CreationOptional<string>;
  declare eventId: CreationOptional<string>;
  declare aggregateType: string;
  declare aggregateId: string;
  declare eventType: string;
  declare payload: Record<string, unknown>;
  declare stockVersion: CreationOptional<string | null>;
  declare occurredAt: CreationOptional<Date>;
  declare publishedAt: CreationOptional<Date | null>;
  declare attemptCount: CreationOptional<number>;
  declare nextAttemptAt: CreationOptional<Date>;
  declare lastError: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initEventOutbox(sequelize: Sequelize) {
  EventOutbox.init({
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    eventId: { type: DataTypes.UUID, allowNull: false, defaultValue: DataTypes.UUIDV4, unique: true },
    aggregateType: { type: DataTypes.STRING(30), allowNull: false },
    aggregateId: { type: DataTypes.UUID, allowNull: false },
    eventType: { type: DataTypes.STRING(80), allowNull: false },
    payload: { type: DataTypes.JSONB, allowNull: false },
    stockVersion: { type: DataTypes.BIGINT, allowNull: true },
    occurredAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    publishedAt: { type: DataTypes.DATE, allowNull: true },
    attemptCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, validate: { min: 0 } },
    nextAttemptAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    lastError: { type: DataTypes.TEXT, allowNull: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE
  }, { sequelize, tableName: "event_outbox", underscored: true });
  return EventOutbox;
}
