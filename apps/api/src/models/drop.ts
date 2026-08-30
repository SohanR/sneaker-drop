import { DataTypes, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional, type Sequelize } from "sequelize";

export class Drop extends Model<InferAttributes<Drop>, InferCreationAttributes<Drop>> {
  declare id: CreationOptional<string>;
  declare name: string;
  declare description: string | null;
  declare imageUrl: string | null;
  declare price: string;
  declare currency: CreationOptional<string>;
  declare totalStock: number;
  declare availableStock: number;
  declare startsAt: Date;
  declare stockVersion: CreationOptional<string>;
  declare createdBy: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initDrop(sequelize: Sequelize) {
  Drop.init({
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    name: { type: DataTypes.STRING(150), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    imageUrl: { type: DataTypes.TEXT, allowNull: true, validate: { isUrl: true } },
    price: { type: DataTypes.DECIMAL(12, 2), allowNull: false, validate: { min: 0 } },
    currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: "USD", validate: { is: /^[A-Z]{3}$/ } },
    totalStock: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 0 } },
    availableStock: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 0 } },
    startsAt: { type: DataTypes.DATE, allowNull: false },
    stockVersion: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
    createdBy: { type: DataTypes.UUID, allowNull: false },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE
  }, { sequelize, tableName: "drops", underscored: true, indexes: [{ fields: ["starts_at"] }, { fields: ["starts_at", "created_at"] }] });
  return Drop;
}
