import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { connectDatabase } from "./db/mongoose.js";
import { createServer } from "http";
import { initSocket } from "./realtime/socket.js";

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
