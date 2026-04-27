import CryptoJS from "crypto-js";

import { AES_KEY, BLOCK_SIZE } from "./protocol";

function toWordArray(bytes: Uint8Array): CryptoJS.lib.WordArray {
  const words: number[] = [];

  for (let index = 0; index < bytes.length; index += 1) {
    const wordIndex = index >>> 2;
    words[wordIndex] ??= 0;
    words[wordIndex] |= bytes[index]! << (24 - (index % 4) * 8);
  }

  return CryptoJS.lib.WordArray.create(words, bytes.length);
}

function fromWordArray(wordArray: CryptoJS.lib.WordArray): Uint8Array {
  const { words, sigBytes } = wordArray;
  const bytes = new Uint8Array(sigBytes);

  for (let index = 0; index < sigBytes; index += 1) {
    bytes[index] = (words[index >>> 2]! >>> (24 - (index % 4) * 8)) & 0xff;
  }

  return bytes;
}

export function padToBlockSize(data: Uint8Array): Uint8Array {
  if (data.length >= BLOCK_SIZE) {
    return data.slice(0, BLOCK_SIZE);
  }

  const padded = new Uint8Array(BLOCK_SIZE);
  padded.set(data);
  return padded;
}

export function encryptCommand(data: Uint8Array): Uint8Array {
  const encrypted = CryptoJS.AES.encrypt(toWordArray(padToBlockSize(data)), toWordArray(AES_KEY), {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.NoPadding
  });

  return fromWordArray(encrypted.ciphertext);
}

export function decryptResponse(data: Uint8Array): Uint8Array {
  const decrypted = CryptoJS.AES.decrypt(
    { ciphertext: toWordArray(data) } as CryptoJS.lib.CipherParams,
    toWordArray(AES_KEY),
    {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.NoPadding
    }
  );

  return fromWordArray(decrypted);
}

export function buildEncryptedPacket(command: string, ...args: number[]): Uint8Array {
  const encoder = new TextEncoder();
  const commandBytes = encoder.encode(command);
  const argBytes = Uint8Array.from(args);
  const payload = new Uint8Array(commandBytes.length + argBytes.length);

  payload.set(commandBytes);
  payload.set(argBytes, commandBytes.length);

  const packet = new Uint8Array(1 + payload.length);
  packet[0] = payload.length;
  packet.set(payload, 1);

  return encryptCommand(packet);
}
