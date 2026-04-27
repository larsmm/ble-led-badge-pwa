import {
  CHARACTERISTICS,
  Command,
  ImageUpload,
  ScrollMode,
  SERVICE_UUID,
  TextRenderer,
  decryptResponse
} from "../../lib/badge-protocol";

type NotificationListener = (data: Uint8Array) => void;
type DisconnectListener = () => void;
type SendTextOptions = {
  brightness?: number;
  fontId?: string;
  letterSpacing?: number;
  scrollMode?: ScrollMode;
  spaceWidthAdjustment?: number;
  speed?: number;
};

function assertBluetoothAvailability(): void {
  if (typeof navigator === "undefined" || !("bluetooth" in navigator)) {
    throw new Error("Web Bluetooth is not available in this browser.");
  }
}

function toUint8Array(value: DataView | ArrayBuffer): Uint8Array {
  if (value instanceof DataView) {
    return new Uint8Array(
      value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength)
    );
  }

  return new Uint8Array(value.slice(0));
}

function toBufferSource(bytes: Uint8Array): ArrayBuffer {
  return bytes.slice().buffer as ArrayBuffer;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export class BadgeClient {
  private readonly notificationListeners = new Set<NotificationListener>();
  private readonly disconnectListeners = new Set<DisconnectListener>();
  private readonly pendingNotifications: Uint8Array[] = [];
  private readonly pendingResolvers = new Set<(value: Uint8Array) => void>();

  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private commandCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private imageUploadCharacteristic: BluetoothRemoteGATTCharacteristic | null =
    null;
  private notifyCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;

  private readonly handleNotification = (
    event: Event
  ): void => {
    const characteristic = event.target as BluetoothRemoteGATTCharacteristic | null;
    const value = characteristic?.value;
    if (!value) {
      return;
    }

    const bytes = decryptResponse(toUint8Array(value));
    const resolver = this.pendingResolvers.values().next().value as
      | ((value: Uint8Array) => void)
      | undefined;

    if (resolver) {
      this.pendingResolvers.delete(resolver);
      resolver(bytes);
    } else {
      this.pendingNotifications.push(bytes);
    }

    for (const listener of this.notificationListeners) {
      listener(bytes);
    }
  };

  private readonly handleDisconnected = (): void => {
    this.server = null;
    this.commandCharacteristic = null;
    this.imageUploadCharacteristic = null;

    if (this.notifyCharacteristic) {
      this.notifyCharacteristic.removeEventListener(
        "characteristicvaluechanged",
        this.handleNotification
      );
    }
    this.notifyCharacteristic = null;

    for (const resolve of this.pendingResolvers) {
      resolve(new Uint8Array());
    }
    this.pendingResolvers.clear();
    this.pendingNotifications.length = 0;

    for (const listener of this.disconnectListeners) {
      listener();
    }
  };

  get isConnected(): boolean {
    return Boolean(this.device?.gatt?.connected && this.server);
  }

  get deviceName(): string {
    return this.device?.name?.trim() || "Unnamed badge";
  }

  get hasSelectedDevice(): boolean {
    return this.device !== null;
  }

  private setDevice(device: BluetoothDevice): void {
    if (this.device && this.device !== device) {
      this.device.removeEventListener(
        "gattserverdisconnected",
        this.handleDisconnected
      );
    }

    this.device = device;
    this.device.addEventListener(
      "gattserverdisconnected",
      this.handleDisconnected
    );
  }

  async requestDevice(): Promise<BluetoothDevice> {
    assertBluetoothAvailability();

    const device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [SERVICE_UUID] }],
      optionalServices: [SERVICE_UUID]
    });

    this.setDevice(device);

    return device;
  }

  async restorePreviouslyGrantedDevice(): Promise<boolean> {
    assertBluetoothAvailability();

    if (typeof navigator.bluetooth.getDevices !== "function") {
      return false;
    }

    const devices = await navigator.bluetooth.getDevices();
    const device = devices.find((candidate) => candidate.gatt);
    if (!device) {
      return false;
    }

    this.setDevice(device);
    return true;
  }

  async connect(device = this.device): Promise<void> {
    if (!device) {
      throw new Error("No badge selected. Request a device first.");
    }

    if (!device.gatt) {
      throw new Error("The selected device does not expose a GATT server.");
    }

    this.device = device;
    this.server = await device.gatt.connect();

    const service = await this.server.getPrimaryService(SERVICE_UUID);
    this.commandCharacteristic = await service.getCharacteristic(
      CHARACTERISTICS.COMMAND
    );
    this.imageUploadCharacteristic = await service.getCharacteristic(
      CHARACTERISTICS.IMAGE_UPLOAD
    );
    this.notifyCharacteristic = await service.getCharacteristic(
      CHARACTERISTICS.NOTIFY
    );

    await this.notifyCharacteristic.startNotifications();
    this.notifyCharacteristic.addEventListener(
      "characteristicvaluechanged",
      this.handleNotification
    );
  }

  async requestDeviceAndConnect(): Promise<void> {
    const device = await this.requestDevice();
    await this.connect(device);
  }

  async disconnect(): Promise<void> {
    if (this.notifyCharacteristic) {
      try {
        this.notifyCharacteristic.removeEventListener(
          "characteristicvaluechanged",
          this.handleNotification
        );
        await this.notifyCharacteristic.stopNotifications();
      } catch {
        // Ignore cleanup failures during disconnect.
      }
    }

    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
    }

    this.handleDisconnected();
  }

  async writeCommand(packet: Uint8Array): Promise<void> {
    if (!this.commandCharacteristic) {
      throw new Error("Badge is not connected.");
    }

    await this.commandCharacteristic.writeValueWithResponse(
      toBufferSource(packet)
    );
  }

  async writeImageUpload(packet: Uint8Array): Promise<void> {
    if (!this.imageUploadCharacteristic) {
      throw new Error("Badge is not connected.");
    }

    await this.imageUploadCharacteristic.writeValueWithoutResponse(
      toBufferSource(packet)
    );
  }

  async waitForNotification(timeoutMs = 5000): Promise<Uint8Array | null> {
    const existing = this.pendingNotifications.shift();
    if (existing) {
      return existing;
    }

    return await new Promise<Uint8Array | null>((resolve) => {
      const timer = window.setTimeout(() => {
        this.pendingResolvers.delete(handleResolve);
        resolve(null);
      }, timeoutMs);

      const handleResolve = (value: Uint8Array) => {
        window.clearTimeout(timer);
        resolve(value.length > 0 ? value : null);
      };

      this.pendingResolvers.add(handleResolve);
    });
  }

  clearPendingNotifications(): void {
    this.pendingNotifications.length = 0;
  }

  async setBrightness(level: number): Promise<void> {
    await this.writeCommand(Command.light(level));
  }

  async setScrollMode(mode: ScrollMode): Promise<void> {
    await this.writeCommand(Command.mode(mode));
  }

  async setSpeed(speed: number): Promise<void> {
    await this.writeCommand(Command.speed(speed));
  }

  async playAnimation(animationId: number): Promise<void> {
    await this.writeCommand(Command.animation(animationId));
  }

  async showImage(imageId: number): Promise<void> {
    await this.writeCommand(Command.image(imageId));
  }

  async checkImages(): Promise<Uint8Array | null> {
    this.clearPendingNotifications();
    await this.writeCommand(Command.check());
    return await this.waitForNotification(3000);
  }

  async uploadImage(imageData: Uint8Array): Promise<boolean> {
    this.clearPendingNotifications();

    await this.writeCommand(Command.dataStart(imageData.length));
    const response = await this.waitForNotification(2000);

    for (const packet of ImageUpload.buildPackets(imageData)) {
      await this.writeImageUpload(packet);
      await sleep(10);
    }

    await this.writeCommand(Command.dataComplete());
    await sleep(100);

    return response !== null;
  }

  async sendText(text: string, options: SendTextOptions = {}): Promise<boolean> {
    const brightness = options.brightness ?? 128;
    const fontId = options.fontId ?? "classic";
    const letterSpacing = options.letterSpacing ?? 1;
    const scrollMode = options.scrollMode ?? ScrollMode.LEFT;
    const spaceWidthAdjustment = options.spaceWidthAdjustment ?? 0;
    const speed = options.speed ?? 50;
    await TextRenderer.ensureFontLoaded(fontId);
    const bitmapData = TextRenderer.renderText(text, {
      fontId,
      letterSpacing,
      spaceWidthAdjustment
    });

    const success = await this.uploadImage(bitmapData);
    if (!success) {
      return false;
    }

    await this.setScrollMode(scrollMode);
    await this.setBrightness(brightness);
    await this.setSpeed(speed);
    return true;
  }

  onNotification(listener: NotificationListener): () => void {
    this.notificationListeners.add(listener);
    return () => {
      this.notificationListeners.delete(listener);
    };
  }

  onDisconnected(listener: DisconnectListener): () => void {
    this.disconnectListeners.add(listener);
    return () => {
      this.disconnectListeners.delete(listener);
    };
  }
}
