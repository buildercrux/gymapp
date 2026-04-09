import crypto from "crypto";

const SCRYPT_KEY_LENGTH = 64;

export const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, SCRYPT_KEY_LENGTH).toString("hex");
  return `${salt}:${derivedKey}`;
};

export const verifyPassword = (password, storedHash) => {
  if (!storedHash || !storedHash.includes(":")) {
    return false;
  }

  const [salt, originalKey] = storedHash.split(":");
  const derivedKey = crypto.scryptSync(password, salt, SCRYPT_KEY_LENGTH).toString("hex");

  return crypto.timingSafeEqual(
    Buffer.from(derivedKey, "hex"),
    Buffer.from(originalKey, "hex"),
  );
};
