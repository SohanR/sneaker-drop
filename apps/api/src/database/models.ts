import { getDatabase } from "../config/database.js";
import { initializeModels } from "../models/index.js";

let models: ReturnType<typeof initializeModels> | undefined;

export function getModels() {
  models ??= initializeModels(getDatabase());
  return models;
}

