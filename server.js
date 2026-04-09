import { createApp } from "./src/app.js";
import { env } from "./src/config/env.js";
import { connectDatabase } from "./src/db/mongoose.js";
import { createServer } from "http";
import { initSocket } from "./src/realtime/socket.js";

const startServer = async () => {
  await connectDatabase();
  const app = createApp();
  const httpServer = createServer(app);
  initSocket(httpServer);

  httpServer.listen(env.port, () => {
    console.log(`Backend running on port ${env.port}`);
  });
};

startServer().catch((error) => {
  console.error("Failed to start backend", error);
  process.exit(1);
});
