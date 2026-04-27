import { describe, expect, it } from "vitest";

import { getWebBluetoothSupport } from "../features/bluetooth";

describe("web bluetooth support", () => {
  it("rejects unsupported browsers", () => {
    expect(
      getWebBluetoothSupport({
        browserName: "Firefox",
        hasBluetoothApi: false,
        isChromiumBased: false,
        isSecureContext: true
      })
    ).toMatchObject({
      isSupported: false,
      message:
        "Firefox does not provide Web Bluetooth. Web Bluetooth is only available in Chrome or other Chromium-based browsers."
    });
  });

  it("rejects insecure contexts", () => {
    expect(
      getWebBluetoothSupport({
        browserName: "Chromium browser",
        hasBluetoothApi: true,
        isChromiumBased: true,
        isSecureContext: false
      })
    ).toMatchObject({
      isSupported: false
    });
  });

  it("accepts secure browsers with bluetooth support", () => {
    expect(
      getWebBluetoothSupport({
        browserName: "Chromium browser",
        hasBluetoothApi: true,
        isChromiumBased: true,
        isSecureContext: true
      })
    ).toMatchObject({
      isSupported: true
    });
  });

  it("mentions Chromium requirement for non-Chromium browsers", () => {
    expect(
      getWebBluetoothSupport({
        browserName: "Safari",
        hasBluetoothApi: false,
        isChromiumBased: false,
        isSecureContext: true
      }).message
    ).toContain("only available in Chrome or other Chromium-based browsers");
  });
});
