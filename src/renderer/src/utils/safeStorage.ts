import { safeStorage } from "electron";

if (!safeStorage.isEncryptionAvailable()) {
  console.log("Encryption is not available on this platform.");
  throw new Error("Encryption is not available on this platform.");
}
