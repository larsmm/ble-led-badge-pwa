export type WebBluetoothEnvironment = {
  hasBluetoothApi: boolean;
  isSecureContext: boolean;
};

export type WebBluetoothSupport = WebBluetoothEnvironment & {
  isSupported: boolean;
  message: string;
};

export function detectWebBluetoothEnvironment(): WebBluetoothEnvironment {
  return {
    hasBluetoothApi:
      typeof navigator !== "undefined" && "bluetooth" in navigator,
    isSecureContext:
      typeof window !== "undefined" ? window.isSecureContext : false
  };
}

export function getWebBluetoothSupport(
  environment: WebBluetoothEnvironment = detectWebBluetoothEnvironment()
): WebBluetoothSupport {
  if (!environment.hasBluetoothApi) {
    return {
      ...environment,
      isSupported: false,
      message:
        "Web Bluetooth is not available in this browser. Use Android Chrome or another Chromium-based browser."
    };
  }

  if (!environment.isSecureContext) {
    return {
      ...environment,
      isSupported: false,
      message:
        "Web Bluetooth requires a secure context. Use localhost in development or HTTPS in production."
    };
  }

  return {
    ...environment,
    isSupported: true,
    message: "Web Bluetooth is available."
  };
}
