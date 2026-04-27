import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";

import {
  Animation,
  ScrollMode,
  TextRenderer,
  bytesToHex
} from "./lib/badge-protocol";
import { BadgeClient, getWebBluetoothSupport } from "./features/bluetooth";
import {
  BADGE_IMAGE_HEIGHT,
  BADGE_IMAGE_WIDTH,
  BinaryPixelGrid,
  PixelView,
  binaryStringsToGrid,
  buildBadgeImageAsset,
  clonePixelGrid,
  createMonochromeImageDataUrl,
  createPreviewDataUrl,
  fileToBadgeImageAsset,
  gridToBinaryStrings,
  invertPixelGrid
} from "./features/images";
import { StatusView } from "./features/status";
import { TextView } from "./features/text";
import { ToolsView } from "./features/tools";

type ConnectionStatus =
  | "idle"
  | "requesting-device"
  | "connecting"
  | "connected"
  | "disconnecting";

type SendStatus = "idle" | "sending";

type ScrollOption = {
  label: string;
  value: ScrollMode;
};

type DraftState = {
  brightness: number;
  fontId: string;
  letterSpacing: number;
  message: string;
  scrollMode: ScrollMode;
  spaceWidthAdjustment: number;
  speed: number;
};

type SavedPreset = {
  draft: DraftState;
  id: string;
  label: string;
};

type PixelPreset = {
  id: string;
  label: string;
  rows: string[];
};

type LocalStorageBackup = {
  app: typeof LOCAL_STORAGE_BACKUP_APP_ID;
  exportedAt: string;
  entries: Record<string, string>;
  version: 1;
};

type AnimationOption = {
  description: string;
  id: number;
  label: string;
};

type AppTab = "text" | "pixel" | "tools" | "status";
type AutoReconnectOptions = { force?: boolean; restoreDevice?: boolean };

const STORAGE_KEY = "ble-led-badge:draft";
const PRESETS_STORAGE_KEY = "ble-led-badge:presets";
const PIXEL_PRESETS_STORAGE_KEY = "ble-led-badge:pixel-presets";
const AUTO_CONNECT_STORAGE_KEY = "ble-led-badge:auto-connect";
const LOCAL_STORAGE_PREFIX = "ble-led-badge:";
const LOCAL_STORAGE_BACKUP_APP_ID = "ble-led-badge-pwa";
const AUTO_CONNECT_COOLDOWN_MS = 4000;

const defaultDraft: DraftState = {
  brightness: 128,
  fontId: "ark-pixel-12-mono",
  letterSpacing: 1,
  message: "",
  scrollMode: ScrollMode.LEFT,
  spaceWidthAdjustment: 0,
  speed: 50
};

const scrollOptions: ScrollOption[] = [
  { label: "Static", value: ScrollMode.STATIC },
  { label: "Left", value: ScrollMode.LEFT },
  { label: "Right", value: ScrollMode.RIGHT },
  { label: "Up", value: ScrollMode.UP },
  { label: "Down", value: ScrollMode.DOWN },
  { label: "Snow", value: ScrollMode.SNOW }
];

const animationOptions: AnimationOption[] = [
  { id: Animation.ANIM_1, label: "Animation 1", description: 'Falling leaves into "love"' },
  { id: Animation.ANIM_2, label: "Animation 2", description: "Four animated hearts" },
  { id: Animation.ANIM_3, label: "Animation 3", description: "Cheers beer tankards" },
  { id: Animation.ANIM_4, label: "Animation 4", description: 'The word "COME" with flashing face' },
  { id: Animation.ANIM_5, label: "Animation 5", description: "Radiating hearts" },
  { id: Animation.ANIM_6, label: "Animation 6", description: "Animated dollar signs" },
  { id: Animation.ANIM_7, label: "Animation 7", description: "Two fish kissing" },
  { id: Animation.ANIM_8, label: "Animation 8", description: "Animal face with thought waves" }
];

function createEmptyPixelGrid(): BinaryPixelGrid {
  return Array.from({ length: BADGE_IMAGE_HEIGHT }, () =>
    Array.from({ length: BADGE_IMAGE_WIDTH }, () => false)
  );
}

function loadDraft(): DraftState {
  if (typeof window === "undefined") {
    return defaultDraft;
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (!rawValue) {
      return defaultDraft;
    }

    const parsed = JSON.parse(rawValue) as Partial<DraftState>;
    return {
      brightness: parsed.brightness ?? defaultDraft.brightness,
      fontId: parsed.fontId ?? defaultDraft.fontId,
      letterSpacing: parsed.letterSpacing ?? defaultDraft.letterSpacing,
      message: parsed.message ?? defaultDraft.message,
      scrollMode: parsed.scrollMode ?? defaultDraft.scrollMode,
      spaceWidthAdjustment:
        parsed.spaceWidthAdjustment ?? defaultDraft.spaceWidthAdjustment,
      speed: parsed.speed ?? defaultDraft.speed
    };
  } catch {
    return defaultDraft;
  }
}

function createPresetId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `preset-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadPresets(): SavedPreset[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(PRESETS_STORAGE_KEY);
    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue) as SavedPreset[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (preset) =>
        typeof preset.id === "string" &&
        typeof preset.label === "string" &&
        typeof preset.draft?.message === "string"
    );
  } catch {
    return [];
  }
}

function loadPixelPresets(): PixelPreset[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(PIXEL_PRESETS_STORAGE_KEY);
    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue) as PixelPreset[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (preset) =>
        typeof preset.id === "string" &&
        typeof preset.label === "string" &&
        Array.isArray(preset.rows)
    );
  } catch {
    return [];
  }
}

function loadAutoConnect(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(AUTO_CONNECT_STORAGE_KEY) === "true";
}

function isLocalStorageBackup(value: unknown): value is LocalStorageBackup {
  if (!value || typeof value !== "object") {
    return false;
  }

  const backup = value as Partial<LocalStorageBackup>;
  return (
    backup.app === LOCAL_STORAGE_BACKUP_APP_ID &&
    backup.version === 1 &&
    typeof backup.entries === "object" &&
    backup.entries !== null &&
    Object.values(backup.entries).every((entry) => typeof entry === "string")
  );
}

function bytesToAscii(bytes: Uint8Array): string {
  return Array.from(bytes, (value) =>
    value >= 32 && value <= 126 ? String.fromCharCode(value) : "."
  ).join("");
}

function isStandaloneDisplayMode(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }

  return window.matchMedia("(display-mode: standalone)").matches;
}

export default function App() {
  const initialDraft = useMemo(() => loadDraft(), []);
  const initialPresets = useMemo(() => loadPresets(), []);
  const initialPixelPresets = useMemo(() => loadPixelPresets(), []);
  const clientRef = useRef<BadgeClient | null>(null);
  const isPointerDrawingRef = useRef(false);
  const pointerDrawValueRef = useRef(false);
  const customImageInvertedRef = useRef(false);
  const lastAutoConnectAttemptRef = useRef(0);
  const autoConnectEnabledRef = useRef(false);
  const isBusyRef = useRef(false);
  const isConnectedRef = useRef(false);
  const suppressNextAutoReconnectRef = useRef(false);
  const connectionAttemptIdRef = useRef(0);
  const tryAutoReconnectRef = useRef<
    (reason: string, options?: AutoReconnectOptions) => Promise<void>
  >(async () => {});
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("idle");
  const [sendStatus, setSendStatus] = useState<SendStatus>("idle");
  const [deviceName, setDeviceName] = useState("No badge selected");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastNotificationHex, setLastNotificationHex] = useState<string | null>(
    null
  );
  const [lastNotificationAscii, setLastNotificationAscii] = useState<
    string | null
  >(null);
  const [toolResponseHex, setToolResponseHex] = useState<string | null>(null);
  const [toolResponseAscii, setToolResponseAscii] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState(
    "Ready to connect to a badge."
  );
  const [activeTab, setActiveTab] = useState<AppTab>("text");
  const [presets, setPresets] = useState<SavedPreset[]>(initialPresets);
  const [selectedPresetId, setSelectedPresetId] = useState(
    initialPresets[0]?.id ?? ""
  );
  const [message, setMessage] = useState(initialDraft.message);
  const [selectedTextFontId, setSelectedTextFontId] = useState(initialDraft.fontId);
  const [letterSpacing, setLetterSpacing] = useState(initialDraft.letterSpacing);
  const [spaceWidthAdjustment, setSpaceWidthAdjustment] = useState(
    initialDraft.spaceWidthAdjustment
  );
  const [brightness, setBrightness] = useState(initialDraft.brightness);
  const [speed, setSpeed] = useState(initialDraft.speed);
  const [scrollMode, setScrollMode] = useState<ScrollMode>(initialDraft.scrollMode);
  const [selectedAnimation, setSelectedAnimation] = useState<number>(
    Animation.ANIM_1
  );
  const [imageSlot, setImageSlot] = useState(1);
  const [customImageFile, setCustomImageFile] = useState<File | null>(null);
  const [customImageName, setCustomImageName] = useState<string | null>(null);
  const [customImageGrid, setCustomImageGrid] = useState<BinaryPixelGrid>(
    createEmptyPixelGrid()
  );
  const [customImageThreshold, setCustomImageThreshold] = useState(140);
  const [customImageInverted, setCustomImageInverted] = useState(false);
  const [customImageEdited, setCustomImageEdited] = useState(false);
  const [pixelPresets, setPixelPresets] =
    useState<PixelPreset[]>(initialPixelPresets);
  const [pixelPresetName, setPixelPresetName] = useState("");
  const [selectedPixelPresetId, setSelectedPixelPresetId] = useState(
    initialPixelPresets[0]?.id ?? ""
  );
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(isStandaloneDisplayMode());
  const [autoConnectEnabled, setAutoConnectEnabled] = useState(loadAutoConnect);

  const support = getWebBluetoothSupport();
  const isConnectionBusy =
    connectionStatus === "requesting-device" ||
    connectionStatus === "connecting" ||
    connectionStatus === "disconnecting";
  const isConnected = connectionStatus === "connected";
  const isSending = sendStatus === "sending";
  const isBusy = isConnectionBusy || isSending;
  const selectedAnimationMeta =
    animationOptions.find((option) => option.id === selectedAnimation) ??
    animationOptions[0]!;
  const customImageAsset = useMemo(
    () => buildBadgeImageAsset(customImageGrid),
    [customImageGrid]
  );
  const isPixelPresetUpdate = pixelPresets.some(
    (preset) => preset.label === pixelPresetName.trim()
  );
  const pixelPresetOptions = useMemo(
    () =>
      pixelPresets.map((preset) => ({
        id: preset.id,
        label: preset.label,
        previewDataUrl: createPreviewDataUrl(binaryStringsToGrid(preset.rows), 2)
      })),
    [pixelPresets]
  );

  useEffect(() => {
    autoConnectEnabledRef.current = autoConnectEnabled;
  }, [autoConnectEnabled]);

  useEffect(() => {
    isBusyRef.current = isBusy;
  }, [isBusy]);

  useEffect(() => {
    isConnectedRef.current = isConnected;
  }, [isConnected]);

  useEffect(() => {
    const client = new BadgeClient();
    clientRef.current = client;

    const stopNotification = client.onNotification((data) => {
      setLastNotificationHex(bytesToHex(data));
      setLastNotificationAscii(bytesToAscii(data));
    });
    const stopDisconnect = client.onDisconnected(() => {
      setConnectionStatus("idle");
      setSendStatus("idle");
      setLastAction("Badge disconnected.");

      if (suppressNextAutoReconnectRef.current) {
        suppressNextAutoReconnectRef.current = false;
        return;
      }

      if (autoConnectEnabledRef.current) {
        window.setTimeout(() => {
          void tryAutoReconnectRef.current("badge disconnected", {
            restoreDevice: false
          });
        }, AUTO_CONNECT_COOLDOWN_MS);
      }
    });

    const handleInstallPrompt = (event: Event) => {
      const promptEvent = event as BeforeInstallPromptEvent;
      promptEvent.preventDefault();
      setInstallPrompt(promptEvent);
    };

    const handleInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      stopNotification();
      stopDisconnect();
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
      void client.disconnect();
      clientRef.current = null;
    };
  }, []);

  useEffect(() => {
    const handlePointerUp = () => {
      isPointerDrawingRef.current = false;
    };

    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const draft: DraftState = {
      brightness,
      fontId: selectedTextFontId,
      letterSpacing,
      message,
      scrollMode,
      spaceWidthAdjustment,
      speed
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  }, [
    brightness,
    letterSpacing,
    message,
    scrollMode,
    selectedTextFontId,
    spaceWidthAdjustment,
    speed
  ]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
  }, [presets]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      PIXEL_PRESETS_STORAGE_KEY,
      JSON.stringify(pixelPresets)
    );
  }, [pixelPresets]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      AUTO_CONNECT_STORAGE_KEY,
      autoConnectEnabled ? "true" : "false"
    );
  }, [autoConnectEnabled]);

  useEffect(() => {
    void TextRenderer.ensureFontLoaded(selectedTextFontId);
  }, [selectedTextFontId]);

  useEffect(() => {
    customImageInvertedRef.current = customImageInverted;
  }, [customImageInverted]);

  useEffect(() => {
    if (!customImageFile) {
      return;
    }

    const file = customImageFile;
    let cancelled = false;

    async function processImage(): Promise<void> {
      try {
        const asset = await fileToBadgeImageAsset(
          file,
          customImageThreshold,
          customImageInvertedRef.current
        );

        if (cancelled) {
          return;
        }

        setCustomImageGrid(asset.pixelGrid);
        setCustomImageEdited(false);
        setErrorMessage(null);
        setLastAction(`Prepared custom image: ${file.name}`);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : "Failed to process custom image."
        );
      }
    }

    void processImage();

    return () => {
      cancelled = true;
    };
  }, [customImageFile, customImageThreshold]);

  async function handleInstallApp(): Promise<void> {
    if (!installPrompt) {
      return;
    }

    await installPrompt.prompt();
    const outcome = await installPrompt.userChoice;
    if (outcome.outcome !== "accepted") {
      setLastAction("Install prompt dismissed.");
      return;
    }

    setInstallPrompt(null);
    setLastAction("App installed on the device.");
  }

  async function handleConnect(): Promise<void> {
    const client = clientRef.current;
    if (!client) {
      return;
    }

    const attemptId = connectionAttemptIdRef.current + 1;
    connectionAttemptIdRef.current = attemptId;
    setErrorMessage(null);
    setLastNotificationHex(null);
    setLastNotificationAscii(null);
    setConnectionStatus("requesting-device");
    setLastAction("Waiting for badge selection.");

    try {
      await client.requestDevice();
      if (connectionAttemptIdRef.current !== attemptId) {
        return;
      }
      setDeviceName(client.deviceName);
      setConnectionStatus("connecting");
      setLastAction("Connecting to badge.");
      await client.connect();
      if (connectionAttemptIdRef.current !== attemptId) {
        await client.disconnect();
        return;
      }
      setConnectionStatus("connected");
      setDeviceName(client.deviceName);
      setLastAction("Connected. Ready to send text.");
    } catch (error) {
      if (connectionAttemptIdRef.current !== attemptId) {
        return;
      }
      setConnectionStatus("idle");
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to connect to badge."
      );
      setLastAction("Connection attempt did not complete.");
    }
  }

  async function handleReconnectSelectedBadge(reason: string): Promise<void> {
    const client = clientRef.current;
    if (!client || !client.hasSelectedDevice) {
      return;
    }

    const attemptId = connectionAttemptIdRef.current + 1;
    connectionAttemptIdRef.current = attemptId;
    setErrorMessage(null);
    setLastNotificationHex(null);
    setLastNotificationAscii(null);
    setConnectionStatus("connecting");
    setLastAction(`Reconnecting to badge (${reason}).`);

    try {
      await client.connect();
      if (connectionAttemptIdRef.current !== attemptId) {
        await client.disconnect();
        return;
      }
      setConnectionStatus("connected");
      setDeviceName(client.deviceName);
      setLastAction("Reconnected to badge.");
    } catch (error) {
      if (connectionAttemptIdRef.current !== attemptId) {
        return;
      }
      setConnectionStatus("idle");
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to reconnect to badge."
      );
      setLastAction("Automatic reconnect did not complete.");
    }
  }

  async function tryAutoReconnect(
    reason: string,
    options: AutoReconnectOptions = {}
  ): Promise<void> {
    const client = clientRef.current;
    if (!client || !autoConnectEnabledRef.current || !support.isSupported) {
      return;
    }

    if (
      document.visibilityState !== "visible" ||
      isConnectedRef.current ||
      isBusyRef.current
    ) {
      return;
    }

    const now = Date.now();
    if (
      !options.force &&
      now - lastAutoConnectAttemptRef.current < AUTO_CONNECT_COOLDOWN_MS
    ) {
      return;
    }

    lastAutoConnectAttemptRef.current = now;

    if (!client.hasSelectedDevice && options.restoreDevice !== false) {
      const restored = await client.restorePreviouslyGrantedDevice();
      if (restored) {
        setDeviceName(client.deviceName);
      }
    }

    if (!client.hasSelectedDevice) {
      setLastAction("Auto connect is enabled. Connect once to select a badge.");
      return;
    }

    await handleReconnectSelectedBadge(reason);
  }

  useEffect(() => {
    tryAutoReconnectRef.current = tryAutoReconnect;
  });

  function handleAbortConnectionAttempt(): void {
    const client = clientRef.current;
    autoConnectEnabledRef.current = false;
    suppressNextAutoReconnectRef.current = true;
    connectionAttemptIdRef.current += 1;
    lastAutoConnectAttemptRef.current = 0;
    setAutoConnectEnabled(false);
    setConnectionStatus("idle");
    setLastAction("Connection attempt aborted.");

    if (client?.isConnected) {
      void client.disconnect();
    }
  }

  function handleAutoConnectChange(nextValue: boolean): void {
    autoConnectEnabledRef.current = nextValue;
    setAutoConnectEnabled(nextValue);

    if (!nextValue) {
      if (isConnectionBusy) {
        handleAbortConnectionAttempt();
      }
      return;
    }

    void tryAutoReconnectRef.current("auto connect enabled", { force: true });
  }

  async function handleDisconnect(): Promise<void> {
    const client = clientRef.current;
    if (!client) {
      return;
    }

    setErrorMessage(null);
    setConnectionStatus("disconnecting");
    setLastAction("Disconnecting from badge.");
    suppressNextAutoReconnectRef.current = true;

    try {
      await client.disconnect();
      setConnectionStatus("idle");
      setLastAction("Disconnected.");
    } catch (error) {
      setConnectionStatus("idle");
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to disconnect cleanly."
      );
      setLastAction("Disconnected with cleanup warnings.");
    }
  }

  async function handleConnectionToggle(): Promise<void> {
    if (isConnectionBusy) {
      handleAbortConnectionAttempt();
      return;
    }

    if (isConnected) {
      await handleDisconnect();
      return;
    }

    await handleConnect();
  }

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void tryAutoReconnectRef.current("app resumed");
      }
    };

    const handleFocus = () => {
      void tryAutoReconnectRef.current("app focused");
    };
    const handlePageShow = () => {
      void tryAutoReconnectRef.current("page shown");
    };
    const retryTimer = window.setInterval(() => {
      void tryAutoReconnectRef.current("retry");
    }, AUTO_CONNECT_COOLDOWN_MS);

    void tryAutoReconnectRef.current("auto connect enabled", { force: true });
    window.addEventListener("focus", handleFocus);
    window.addEventListener("pageshow", handlePageShow);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(retryTimer);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("pageshow", handlePageShow);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [autoConnectEnabled]);

  async function handleAnimationTest(): Promise<void> {
    const client = clientRef.current;
    if (!client) {
      return;
    }

    setErrorMessage(null);
    setLastAction(`Sending ${selectedAnimationMeta.label}.`);

    try {
      await client.playAnimation(selectedAnimation);
      setLastAction(`${selectedAnimationMeta.label} sent.`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to send animation command."
      );
      setLastAction(`${selectedAnimationMeta.label} failed.`);
    }
  }

  async function handleSendText(): Promise<void> {
    const client = clientRef.current;
    if (!client) {
      return;
    }

    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      setErrorMessage("Enter a message before sending.");
      return;
    }

    setErrorMessage(null);
    setSendStatus("sending");
    setLastAction("Uploading rendered text to badge.");

    try {
      const success = await client.sendText(trimmedMessage, {
        brightness,
        fontId: selectedTextFontId,
        letterSpacing,
        scrollMode,
        spaceWidthAdjustment,
        speed
      });

      if (!success) {
        setErrorMessage(
          "The badge did not acknowledge the upload start command."
        );
        setLastAction("Text upload did not receive a badge acknowledgment.");
      } else {
        setLastAction(`Text sent: "${trimmedMessage}"`);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to send text to badge."
      );
      setLastAction("Text upload failed.");
    } finally {
      setSendStatus("idle");
    }
  }

  async function handleCheckImages(): Promise<void> {
    const client = clientRef.current;
    if (!client) {
      return;
    }

    setErrorMessage(null);
    setToolResponseHex(null);
    setToolResponseAscii(null);
    setLastAction("Checking stored image slots on the badge.");

    try {
      const response = await client.checkImages();
      if (!response) {
        setLastAction("No response received for image slot check.");
        return;
      }

      setToolResponseHex(bytesToHex(response));
      setToolResponseAscii(bytesToAscii(response));
      setLastAction("Stored image slot check completed.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to check stored images."
      );
      setLastAction("Stored image slot check failed.");
    }
  }

  async function handleUploadCustomImage(): Promise<void> {
    const client = clientRef.current;
    if (!client) {
      return;
    }

    setErrorMessage(null);
    setSendStatus("sending");
    setLastAction("Uploading custom image to the badge.");

    try {
      const success = await client.uploadImage(customImageAsset.bitmapData);
      if (!success) {
        setErrorMessage(
          "The badge did not acknowledge the custom image upload start command."
        );
        setLastAction("Custom image upload did not receive a badge acknowledgment.");
        return;
      }

      await client.setScrollMode(ScrollMode.STATIC);
      await client.setBrightness(brightness);
      setLastAction(`Custom image uploaded: ${customImageName ?? "selected file"}`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to upload custom image."
      );
      setLastAction("Custom image upload failed.");
    } finally {
      setSendStatus("idle");
    }
  }

  async function handleShowImage(): Promise<void> {
    const client = clientRef.current;
    if (!client) {
      return;
    }

    setErrorMessage(null);
    setLastAction(`Showing stored image slot ${imageSlot}.`);

    try {
      await client.showImage(imageSlot);
      setLastAction(`Stored image slot ${imageSlot} requested.`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to show stored image."
      );
      setLastAction(`Stored image slot ${imageSlot} failed.`);
    }
  }

  function getCurrentDraft(): DraftState {
    return {
      brightness,
      fontId: selectedTextFontId,
      letterSpacing,
      message,
      scrollMode,
      spaceWidthAdjustment,
      speed
    };
  }

  function applyPreset(preset: SavedPreset): void {
    setMessage(preset.draft.message);
    setSelectedTextFontId(preset.draft.fontId);
    setLetterSpacing(preset.draft.letterSpacing);
    setSpaceWidthAdjustment(
      preset.draft.spaceWidthAdjustment ?? defaultDraft.spaceWidthAdjustment
    );
    setBrightness(preset.draft.brightness);
    setScrollMode(preset.draft.scrollMode);
    setSpeed(preset.draft.speed);
    setLastAction(`Preset loaded: ${preset.label}`);
  }

  function applyDraft(draft: DraftState): void {
    setMessage(draft.message);
    setSelectedTextFontId(draft.fontId);
    setLetterSpacing(draft.letterSpacing);
    setSpaceWidthAdjustment(
      draft.spaceWidthAdjustment ?? defaultDraft.spaceWidthAdjustment
    );
    setBrightness(draft.brightness);
    setScrollMode(draft.scrollMode);
    setSpeed(draft.speed);
  }

  function savePreset(): void {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      setErrorMessage("Enter a message before saving a preset.");
      return;
    }

    const nextPreset: SavedPreset = {
      draft: getCurrentDraft(),
      id: createPresetId(),
      label: trimmedMessage
    };

    setPresets((currentPresets) => [...currentPresets, nextPreset]);
    setSelectedPresetId(nextPreset.id);
    setErrorMessage(null);
    setLastAction(`Preset saved: ${nextPreset.label}`);
  }

  function loadPresetById(presetId: string): void {
    setSelectedPresetId(presetId);
    const selectedPreset = presets.find((preset) => preset.id === presetId);
    if (!selectedPreset) {
      return;
    }

    setErrorMessage(null);
    applyPreset(selectedPreset);
  }

  function deleteSelectedPreset(): void {
    const selectedPreset = presets.find((preset) => preset.id === selectedPresetId);
    if (!selectedPreset) {
      setErrorMessage("Select a preset before deleting.");
      return;
    }

    setPresets((currentPresets) => {
      const nextPresets = currentPresets.filter(
        (preset) => preset.id !== selectedPreset.id
      );
      setSelectedPresetId(nextPresets[0]?.id ?? "");
      return nextPresets;
    });
    setErrorMessage(null);
    setLastAction(`Preset deleted: ${selectedPreset.label}`);
  }

  function savePixelPreset(): void {
    const trimmedName = pixelPresetName.trim();
    if (!trimmedName) {
      setErrorMessage("Enter a pixel preset name before saving.");
      return;
    }

    const existingPreset = pixelPresets.find(
      (preset) => preset.label === trimmedName
    );
    if (existingPreset) {
      setPixelPresets((currentPresets) =>
        currentPresets.map((preset) =>
          preset.id === existingPreset.id
            ? { ...preset, rows: gridToBinaryStrings(customImageGrid) }
            : preset
        )
      );
      setSelectedPixelPresetId(existingPreset.id);
      setErrorMessage(null);
      setLastAction(`Pixel preset updated: ${existingPreset.label}`);
      return;
    }

    const nextPreset: PixelPreset = {
      id: createPresetId(),
      label: trimmedName,
      rows: gridToBinaryStrings(customImageGrid)
    };

    setPixelPresets((currentPresets) => [...currentPresets, nextPreset]);
    setSelectedPixelPresetId(nextPreset.id);
    setErrorMessage(null);
    setLastAction(`Pixel preset saved: ${nextPreset.label}`);
  }

  function loadSelectedPixelPreset(): void {
    const selectedPreset = pixelPresets.find(
      (preset) => preset.id === selectedPixelPresetId
    );
    if (!selectedPreset) {
      setErrorMessage("Select a pixel preset before loading.");
      return;
    }

    setCustomImageGrid(binaryStringsToGrid(selectedPreset.rows));
    setCustomImageFile(null);
    setCustomImageName(selectedPreset.label);
    setPixelPresetName(selectedPreset.label);
    setErrorMessage(null);
    setLastAction(`Pixel preset loaded: ${selectedPreset.label}`);
  }

  function deleteSelectedPixelPreset(): void {
    const selectedPreset = pixelPresets.find(
      (preset) => preset.id === selectedPixelPresetId
    );
    if (!selectedPreset) {
      setErrorMessage("Select a pixel preset before deleting.");
      return;
    }

    setPixelPresets((currentPresets) => {
      const nextPresets = currentPresets.filter(
        (preset) => preset.id !== selectedPreset.id
      );
      setSelectedPixelPresetId(nextPresets[0]?.id ?? "");
      return nextPresets;
    });
    setErrorMessage(null);
    setLastAction(`Pixel preset deleted: ${selectedPreset.label}`);
  }

  function handleBrightnessChange(event: ChangeEvent<HTMLInputElement>): void {
    setBrightness(Number(event.target.value));
  }

  function handleLetterSpacingChange(event: ChangeEvent<HTMLInputElement>): void {
    setLetterSpacing(Number(event.target.value));
  }

  function handleSpaceWidthAdjustmentChange(
    event: ChangeEvent<HTMLInputElement>
  ): void {
    setSpaceWidthAdjustment(Number(event.target.value));
  }

  function handleSpeedChange(event: ChangeEvent<HTMLInputElement>): void {
    setSpeed(Number(event.target.value));
  }

  function handleTextFontChange(event: ChangeEvent<HTMLSelectElement>): void {
    const nextFontId = event.target.value;
    setSelectedTextFontId(nextFontId);
    const nextFont = TextRenderer.getFontOption(nextFontId);
    setLastAction(`Badge text font changed to ${nextFont.label}.`);
  }

  function handleScrollModeChange(event: ChangeEvent<HTMLSelectElement>): void {
    setScrollMode(Number(event.target.value) as ScrollMode);
  }

  function handleAnimationChange(event: ChangeEvent<HTMLSelectElement>): void {
    setSelectedAnimation(Number(event.target.value));
  }

  function handleImageSlotChange(event: ChangeEvent<HTMLInputElement>): void {
    setImageSlot(Number(event.target.value));
  }

  function handleCustomImageFileChange(
    event: ChangeEvent<HTMLInputElement>
  ): void {
    const file = event.target.files?.[0] ?? null;
    setCustomImageFile(file);
    setCustomImageName(file?.name ?? null);
    setCustomImageEdited(false);
  }

  function handleCustomImageThresholdChange(
    event: ChangeEvent<HTMLInputElement>
  ): void {
    setCustomImageThreshold(Number(event.target.value));
  }

  function handleCustomImageInvert(): void {
    setCustomImageInverted((currentValue) => !currentValue);
    setCustomImageGrid((currentGrid) => invertPixelGrid(currentGrid));
    setCustomImageEdited(true);
    setLastAction("Custom image inverted.");
  }

  function paintCustomImagePixel(
    row: number,
    column: number,
    nextValue: boolean
  ): void {
    setCustomImageGrid((currentGrid) => {
      if (currentGrid[row]?.[column] === nextValue) {
        return currentGrid;
      }

      const nextGrid = clonePixelGrid(currentGrid);
      nextGrid[row]![column] = nextValue;
      return nextGrid;
    });
  }

  function handleCustomImageClear(): void {
    setCustomImageGrid(createEmptyPixelGrid());
    setCustomImageFile(null);
    setCustomImageName(null);
    setCustomImageEdited(true);
    setLastAction("Custom image canvas cleared.");
  }

  function handlePixelPointerDown(row: number, column: number): void {
    const nextValue = !customImageGrid[row]?.[column];
    isPointerDrawingRef.current = true;
    pointerDrawValueRef.current = nextValue;
    paintCustomImagePixel(row, column, nextValue);
    setCustomImageEdited(true);
    setLastAction(`Edited custom image pixel at row ${row + 1}, column ${column + 1}.`);
  }

  function handlePixelPointerEnter(row: number, column: number): void {
    if (!isPointerDrawingRef.current) {
      return;
    }

    paintCustomImagePixel(row, column, pointerDrawValueRef.current);
  }

  function handlePixelPointerEnd(): void {
    isPointerDrawingRef.current = false;
  }

  function handleSaveCustomImage(): void {
    const link = document.createElement("a");
    link.href = createMonochromeImageDataUrl(customImageGrid);
    link.download = `${customImageName ?? "badge-image"}.png`;
    link.click();
    setLastAction("Custom image saved as 48x12 PNG.");
  }

  function handleExportLocalStorage(): void {
    if (typeof window === "undefined") {
      return;
    }

    const entries = Object.fromEntries(
      Object.entries(window.localStorage).filter(([key]) =>
        key.startsWith(LOCAL_STORAGE_PREFIX)
      )
    );
    const backup: LocalStorageBackup = {
      app: LOCAL_STORAGE_BACKUP_APP_ID,
      entries,
      exportedAt: new Date().toISOString(),
      version: 1
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ble-led-badge-backup-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setLastAction("Local storage backup exported.");
  }

  function handleClearLocalStorage(): void {
    if (typeof window === "undefined") {
      return;
    }

    const confirmed = window.confirm(
      "Delete all saved app data on this device? This removes local text and pixel settings and all presets."
    );
    if (!confirmed) {
      return;
    }

    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith(LOCAL_STORAGE_PREFIX)) {
        window.localStorage.removeItem(key);
      }
    }

    applyDraft(defaultDraft);
    setPresets([]);
    setSelectedPresetId("");
    setPixelPresets([]);
    setSelectedPixelPresetId("");
    setPixelPresetName("");
    autoConnectEnabledRef.current = false;
    setAutoConnectEnabled(false);
    setErrorMessage(null);
    setLastAction("Local app data cleared.");
  }

  async function handleImportLocalStorage(
    event: ChangeEvent<HTMLInputElement>
  ): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      if (!isLocalStorageBackup(parsed)) {
        throw new Error("The selected file is not a valid backup.");
      }

      for (const [key, value] of Object.entries(parsed.entries)) {
        if (key.startsWith(LOCAL_STORAGE_PREFIX)) {
          window.localStorage.setItem(key, value);
        }
      }

      const restoredDraft = loadDraft();
      const restoredPresets = loadPresets();
      const restoredPixelPresets = loadPixelPresets();
      applyDraft(restoredDraft);
      setPresets(restoredPresets);
      setSelectedPresetId(restoredPresets[0]?.id ?? "");
      setPixelPresets(restoredPixelPresets);
      setSelectedPixelPresetId(restoredPixelPresets[0]?.id ?? "");
      setPixelPresetName("");
      setAutoConnectEnabled(loadAutoConnect());
      setErrorMessage(null);
      setLastAction("Local storage backup imported.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to import backup."
      );
      setLastAction("Local storage backup import failed.");
    }
  }

  return (
    <main className="app-shell">
      <section className="app-header">
        <div>
          <p className="eyebrow">BLE LED Badge</p>
          <h1>Badge Control</h1>
          <p className="header-device">{deviceName}</p>
        </div>
        <div className="header-actions">
          <div className="status-line header-status">
            <span className={`status-dot status-${connectionStatus}`} />
            <span>{connectionStatus}</span>
            <label className="status-toggle" htmlFor="auto-connect-toggle">
              <input
                id="auto-connect-toggle"
                type="checkbox"
                checked={autoConnectEnabled}
                onChange={(event) => handleAutoConnectChange(event.target.checked)}
                disabled={!support.isSupported}
              />
              Auto connect
            </label>
          </div>
          <div className="button-row">
            <button
              className="primary-button"
              type="button"
              onClick={() => void handleConnectionToggle()}
              disabled={!support.isSupported || isSending}
            >
              {isConnectionBusy
                ? "Abort"
                : isConnected
                  ? "Disconnect Badge"
                  : "Connect Badge"}
            </button>
          </div>
        </div>
      </section>

      <nav className="tab-bar" aria-label="Primary">
        <button
          className={`tab-button ${activeTab === "text" ? "tab-active" : ""}`}
          type="button"
          onClick={() => setActiveTab("text")}
        >
          Text
        </button>
        <button
          className={`tab-button ${activeTab === "pixel" ? "tab-active" : ""}`}
          type="button"
          onClick={() => setActiveTab("pixel")}
        >
          Pixel
        </button>
        <button
          className={`tab-button ${activeTab === "tools" ? "tab-active" : ""}`}
          type="button"
          onClick={() => setActiveTab("tools")}
        >
          Tools
        </button>
        <button
          className={`tab-button ${activeTab === "status" ? "tab-active" : ""}`}
          type="button"
          onClick={() => setActiveTab("status")}
        >
          Status
        </button>
      </nav>

      <section className="tab-content" aria-label="Project status">
        {!support.isSupported && !support.hasBluetoothApi ? (
          <article className="panel">
            <h2>Browser Support</h2>
            <p className="support-summary">{support.message}</p>
          </article>
        ) : null}

        {activeTab === "text" ? (
          <TextView
            brightness={brightness}
            letterSpacing={letterSpacing}
            message={message}
            onBrightnessChange={handleBrightnessChange}
            onDeletePreset={deleteSelectedPreset}
            onLetterSpacingChange={handleLetterSpacingChange}
            onLoadPreset={loadPresetById}
            onMessageChange={setMessage}
            onSavePreset={savePreset}
            onScrollModeChange={handleScrollModeChange}
            onSpaceWidthAdjustmentChange={handleSpaceWidthAdjustmentChange}
            onSpeedChange={handleSpeedChange}
            onTextFontChange={handleTextFontChange}
            presets={presets}
            scrollMode={scrollMode}
            scrollOptions={scrollOptions}
            selectedPresetId={selectedPresetId}
            selectedTextFontId={selectedTextFontId}
            spaceWidthAdjustment={spaceWidthAdjustment}
            speed={speed}
            isBusy={isSending}
          />
        ) : null}

        {activeTab === "tools" ? (
          <ToolsView
            animationOptions={animationOptions}
            imageSlot={imageSlot}
            isBusy={isBusy}
            isConnected={isConnected}
            onAnimationChange={handleAnimationChange}
            onCheckImages={() => void handleCheckImages()}
            onImageSlotChange={handleImageSlotChange}
            onPlayAnimation={() => void handleAnimationTest()}
            onShowImage={() => void handleShowImage()}
            selectedAnimation={selectedAnimation}
            selectedAnimationDescription={selectedAnimationMeta.description}
            toolResponseAscii={toolResponseAscii}
            toolResponseHex={toolResponseHex}
          />
        ) : null}

        {activeTab === "pixel" ? (
          <PixelView
            customImageGrid={customImageGrid}
            customImageThreshold={customImageThreshold}
            customImageShowThreshold={customImageFile !== null && !customImageEdited}
            isPresetUpdate={isPixelPresetUpdate}
            isBusy={isSending}
            onClearImage={handleCustomImageClear}
            onDeletePreset={deleteSelectedPixelPreset}
            onFileChange={handleCustomImageFileChange}
            onInvertImage={handleCustomImageInvert}
            onLoadPreset={loadSelectedPixelPreset}
            onPixelPointerDown={handlePixelPointerDown}
            onPixelPointerEnter={handlePixelPointerEnter}
            onPixelPointerEnd={handlePixelPointerEnd}
            onPresetNameChange={setPixelPresetName}
            onSavePreset={savePixelPreset}
            onSaveImage={handleSaveCustomImage}
            onSelectPreset={(presetId) => {
              setSelectedPixelPresetId(presetId);
              const selectedPreset = pixelPresets.find(
                (preset) => preset.id === presetId
              );
              setPixelPresetName(selectedPreset?.label ?? "");
            }}
            onThresholdChange={handleCustomImageThresholdChange}
            pixelPresetName={pixelPresetName}
            presets={pixelPresetOptions}
            selectedPresetId={selectedPixelPresetId}
          />
        ) : null}

        {activeTab === "status" ? (
          <StatusView
            connectionStatus={connectionStatus}
            deviceName={deviceName}
            errorMessage={errorMessage}
            installPrompt={installPrompt}
            isInstalled={isInstalled}
            lastAction={lastAction}
            lastNotificationAscii={lastNotificationAscii}
            lastNotificationHex={lastNotificationHex}
            onClearLocalStorage={handleClearLocalStorage}
            onExportLocalStorage={handleExportLocalStorage}
            onImportLocalStorage={(event) => void handleImportLocalStorage(event)}
            onInstallApp={() => void handleInstallApp()}
            support={support}
          />
        ) : null}
      </section>

      {activeTab === "text" || activeTab === "pixel" ? (
        <div className="bottom-action-bar" aria-label="Primary action">
          {activeTab === "text" ? (
            <button
              className="primary-button bottom-action-button"
              type="button"
              onClick={() => void handleSendText()}
              disabled={!isConnected || isSending || message.trim().length === 0}
            >
              {isSending ? "Sending..." : "Send Text"}
            </button>
          ) : (
            <button
              className="primary-button bottom-action-button"
              type="button"
              onClick={() => void handleUploadCustomImage()}
              disabled={!isConnected || isSending}
            >
              {isSending ? "Uploading..." : "Upload Image"}
            </button>
          )}
        </div>
      ) : null}
    </main>
  );
}
