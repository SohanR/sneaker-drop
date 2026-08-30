import { createSocketServer } from "./create-server.js";
import { socketEnv } from "./config/env.js";

const { httpServer } = createSocketServer(socketEnv.allowedOrigins);
httpServer.listen(socketEnv.SOCKET_PORT, () => {
  console.log(`Socket service listening on http://localhost:${socketEnv.SOCKET_PORT}`);
});

