import { buildEncryptedPacket, encryptCommand } from "./encryption";

export enum Animation {
  NONE = 0,
  ANIM_1 = 1,
  ANIM_2 = 2,
  ANIM_3 = 3,
  ANIM_4 = 4,
  ANIM_5 = 5,
  ANIM_6 = 6,
  ANIM_7 = 7,
  ANIM_8 = 8
}

export enum ScrollMode {
  STATIC = 1,
  LEFT = 3,
  RIGHT = 4,
  UP = 5,
  DOWN = 6,
  SNOW = 7
}

export class Command {
  static ledOn(): Uint8Array {
    return buildEncryptedPacket("LEDON");
  }

  static ledOff(): Uint8Array {
    return buildEncryptedPacket("LEDOFF");
  }

  static light(brightness: number): Uint8Array {
    return buildEncryptedPacket("LIGHT", brightness);
  }

  static mode(scrollMode: number): Uint8Array {
    return buildEncryptedPacket("MODE", scrollMode);
  }

  static image(imageId: number): Uint8Array {
    return buildEncryptedPacket("IMAG", imageId);
  }

  static animation(animationId: number): Uint8Array {
    return buildEncryptedPacket("ANIM", animationId);
  }

  static speed(speedLevel: number): Uint8Array {
    return buildEncryptedPacket("SPEED", speedLevel);
  }

  static play(imageIds: readonly number[]): Uint8Array {
    return buildEncryptedPacket("PLAY", imageIds.length, ...imageIds);
  }

  static delete(imageIds: readonly number[]): Uint8Array {
    return buildEncryptedPacket("DELE", imageIds.length, ...imageIds);
  }

  static check(): Uint8Array {
    return buildEncryptedPacket("CHEC");
  }

  static dataComplete(): Uint8Array {
    return buildEncryptedPacket("DATCP");
  }

  static dataStart(length: number): Uint8Array {
    const lengthHigh = (length >> 8) & 0xff;
    const lengthLow = length & 0xff;
    return buildEncryptedPacket("DATS", lengthHigh, lengthLow, 0x00, 0x00);
  }
}

export class ImageUpload {
  static buildPackets(imageData: Uint8Array): Uint8Array[] {
    const packets: Uint8Array[] = [];

    for (let offset = 0; offset < imageData.length; offset += 15) {
      const chunk = imageData.slice(offset, offset + 15);
      const packet = new Uint8Array(16);
      packet[0] = chunk.length;
      packet.set(chunk, 1);
      packets.push(encryptCommand(packet));
    }

    return packets;
  }
}
