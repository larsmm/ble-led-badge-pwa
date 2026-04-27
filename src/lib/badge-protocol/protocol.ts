export const SERVICE_UUID = "0000fee9-0000-1000-8000-00805f9b34fb";

export const CHARACTERISTICS = {
  COMMAND: "d44bc439-abfd-45a2-b575-925416129600",
  IMAGE_UPLOAD: "d44bc439-abfd-45a2-b575-92541612960a",
  WRITE_3: "d44bc439-abfd-45a2-b575-92541612960b",
  NOTIFY: "d44bc439-abfd-45a2-b575-925416129601"
} as const;

export const AES_KEY = Uint8Array.from([
  0x34, 0x52, 0x2a, 0x5b, 0x7a, 0x6e, 0x49, 0x2c, 0x08, 0x09, 0x0a, 0x9d,
  0x8d, 0x2a, 0x23, 0xf8
]);

export const BLOCK_SIZE = 16;
export const MAX_IMAGE_PAYLOAD = 98;
