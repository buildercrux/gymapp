import mongoose from "mongoose";
import { env } from "../config/env.js";
import { User } from "../models/User.js";

let connectPromise = null;

const dropIndexIfPresent = async (collection, name) => {
  const indexes = await collection.indexes();
  const exists = indexes.some((index) => index.name === name);

  if (exists) {
    await collection.dropIndex(name);
  }
};

export const ensureDatabaseConnection = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!connectPromise) {
    mongoose.set("strictQuery", true);
    connectPromise = mongoose
      .connect(env.mongoUri, {
        autoIndex: true,
        serverSelectionTimeoutMS: 10_000,
      })
      .catch((error) => {
        connectPromise = null;
        throw error;
      });
  }

  await connectPromise;
  return mongoose.connection;
};

export const connectDatabase = async () => {
  await ensureDatabaseConnection();
  const collection = User.collection;

  // Rebuild contact indexes in a safe order so old null values do not block startup.
  await dropIndexIfPresent(collection, "phone_1");
  await dropIndexIfPresent(collection, "email_1");

  // Remove invalid optional values so the sparse unique phone/email indexes work correctly.
  await User.updateMany({ phone: { $in: [null, ""] } }, { $unset: { phone: 1 } });
  await User.updateMany({ email: { $in: [null, ""] } }, { $unset: { email: 1 } });

  await User.syncIndexes();
};
