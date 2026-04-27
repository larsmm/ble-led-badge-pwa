export type WebBluetoothEnvironment = {
  browserName: string;
  hasBluetoothApi: boolean;
  isChromiumBased: boolean;
  isSecureContext: boolean;
};

export type WebBluetoothSupport = WebBluetoothEnvironment & {
  isSupported: boolean;
  message: string;
};

function detectBrowser(userAgent: string): {
  browserName: string;
  isChromiumBased: boolean;
} {
  const normalized = userAgent.toLowerCase();

  if (normalized.includes("firefox")) {
    return { browserName: "Firefox", isChromiumBased: false };
  }

  if (normalized.includes("edg/")) {
    return { browserName: "Microsoft Edge", isChromiumBased: true };
  }

  if (normalized.includes("opr/") || normalized.includes("opera")) {
    return { browserName: "Opera", isChromiumBased: true };
  }

  if (normalized.includes("brave")) {
    return { browserName: "Brave", isChromiumBased: true };
  }

  if (normalized.includes("chrome") || normalized.includes("chromium")) {
    return { browserName: "Chromium browser", isChromiumBased: true };
  }

  if (normalized.includes("safari") && !normalized.includes("chrome")) {
    return { browserName: "Safari", isChromiumBased: false };
  }

  return { browserName: "This browser", isChromiumBased: false };
}

export function detectWebBluetoothEnvironment(): WebBluetoothEnvironment {
  const browser = detectBrowser(
    typeof navigator !== "undefined" ? navigator.userAgent : ""
  );

  return {
    ...browser,
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
    const browserHint = environment.isChromiumBased
      ? "Web Bluetooth is not exposed in this browser session."
      : "Web Bluetooth is only available in Chrome or other Chromium-based browsers.";

    return {
      ...environment,
      isSupported: false,
      message: environment.isChromiumBased
        ? `${environment.browserName} does not provide Web Bluetooth here. ${browserHint} Use Android Chrome or another Chromium-based browser.`
        : `${environment.browserName} does not provide Web Bluetooth. ${browserHint}`
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
