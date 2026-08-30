import { fileURLToPath } from "node:url";
import { config } from "dotenv";

// npm workspaces execute this service with apps/socket as the working directory.
// Resolve from this module so local configuration is stable from every entry point.
const repositoryEnvPath = fileURLToPath(new URL("../../../../.env", import.meta.url));

config({ path: repositoryEnvPath, override: false, quiet: true });
