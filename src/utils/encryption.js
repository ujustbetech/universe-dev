import CryptoJS from "crypto-js";

// ⚠️ Move this key to env later (NEXT_PUBLIC_ only for demo)
const SECRET_KEY = process.env.NEXT_PUBLIC_KYC_SECRET || "ujb-kyc-secret-key";

export const encryptData = (data) => {
  if (!data) return "";
  return CryptoJS.AES.encrypt(data, SECRET_KEY).toString();
};

export const decryptData = (cipherText) => {
  if (!cipherText) return "";
  const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};
