import { describe, expect, it } from "vitest";

import { getPixelSize } from "../features/images";

describe("PixelView responsive grid", () => {
  it.each([
    { containerWidth: 320, expectedSize: 5 },
    { containerWidth: 390, expectedSize: 7 },
    { containerWidth: 740, expectedSize: 14 },
    { containerWidth: 960, expectedSize: 14 }
  ])(
    "uses whole CSS pixels for a $containerWidth px container",
    ({ containerWidth, expectedSize }) => {
      expect(getPixelSize(containerWidth)).toBe(expectedSize);
    }
  );

  it("keeps a usable minimum size on very narrow screens", () => {
    expect(getPixelSize(240)).toBe(4);
  });
});
