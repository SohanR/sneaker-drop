import { createAdapter } from "@socket.io/postgres-adapter";
import type { Pool } from "pg";
import type { Server } from "socket.io";

export function configurePostgresAdapter(io: Server, pool: Pool) {
  io.adapter(createAdapter(pool, {
    tableName: "socket_io_attachments",
    channelPrefix: "sneaker-drop.socket.io"
  }));
}
