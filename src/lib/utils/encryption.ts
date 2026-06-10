import CryptoJS from "crypto-js";

const getKey = () => {
  const key = process.env.NEXT_PUBLIC_ENCRYPTION_KEY;
  if (!key) throw new Error("Encryption key not configured");
  return key;
};

export const encrypt = (plaintext: string): string => {
  return CryptoJS.AES.encrypt(plaintext, getKey()).toString();
};

export const decrypt = (ciphertext: string): string => {
  const bytes = CryptoJS.AES.decrypt(ciphertext, getKey());
  return bytes.toString(CryptoJS.enc.Utf8);
};

export const encryptJson = <T>(data: T): string => {
  return encrypt(JSON.stringify(data));
};

export const decryptJson = <T>(ciphertext: string): T => {
  return JSON.parse(decrypt(ciphertext));
};
