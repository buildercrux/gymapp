import crypto from "crypto";

export const generateOtpCode = () => {
  const value = crypto.randomInt(0, 1_000_000);
  return String(value).padStart(6, "0");
};
