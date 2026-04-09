import mongoose from "mongoose";
import { connectDatabase } from "../src/db/mongoose.js";
import { User } from "../src/models/User.js";

const run = async () => {
  await connectDatabase();

  // If older code inserted explicit nulls, sparse unique indexes would still collide.
  await Promise.all([
    User.updateMany({ phone: null }, { $unset: { phone: "" } }),
    User.updateMany({ email: null }, { $unset: { email: "" } }),
  ]);

  await User.syncIndexes();

  const indexes = await User.collection.indexes();
  console.log("User indexes synced:", indexes.map((idx) => idx.name));

  await mongoose.connection.close();
};

run().catch(async (error) => {
  console.error(error);
  try {
    await mongoose.connection.close();
  } catch {
    // ignore
  }
  process.exit(1);
});

