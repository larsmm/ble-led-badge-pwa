import { describe, expect, it } from "vitest";

import { getWebBluetoothSupport } from "../features/bluetooth";

describe("web bluetooth support", () => {
  it("rejects unsupported browsers", () => {
    expect(
      getWebBluetoothSupport({
        hasBluetoothApi: false,
        isSecureContext: true
      })
    ).toMatchObject({
      isSupported: false
    });
  });

  it("rejects insecure contexts", () => {
    expect(
      getWebBluetoothSupport({
        hasBluetoothApi: true,
        isSecureContext: false
      })
    ).toMatchObject({
      isSupported: false
    });
  });

  it("accepts secure browsers with bluetooth support", () => {
    expect(
      getWebBluetoothSupport({
        hasBluetoothApi: true,
        isSecureContext: true
      })
    ).toMatchObject({
      isSupported: true
    });
  });
});
