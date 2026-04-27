import { describe, expect, it } from "vitest";

import {
  Command,
  ImageUpload,
  LARGE_SYMBOL_MARKER,
  SYMBOL_PICKER_ITEMS,
  ScrollMode,
  TextRenderer,
  bytesToHex,
  hexToBytes,
  padToBlockSize
} from "../lib/badge-protocol";

describe("badge protocol port", () => {
  it("pads command payloads to one AES block", () => {
    expect(bytesToHex(padToBlockSize(hexToBytes("010203")))).toBe(
      "01020300000000000000000000000000"
    );
  });

  it("matches the Python LEDON command", () => {
    expect(bytesToHex(Command.ledOn())).toBe("ebd372ed98857317f2f54cd2130fdc9c");
  });

  it("matches the Python LIGHT command", () => {
    expect(bytesToHex(Command.light(128))).toBe("9ea72be6b666e290d7ee1ee0d5cdec8e");
  });

  it("matches the Python MODE command", () => {
    expect(bytesToHex(Command.mode(ScrollMode.LEFT))).toBe(
      "0adbfdd9e856e54e61f3c9d35452d5d0"
    );
  });

  it("matches the Python DATS command", () => {
    expect(bytesToHex(Command.dataStart(18))).toBe("441b4c52459ff41aabe5f23c0fa5b867");
  });

  it("matches the Python CHECK command", () => {
    expect(bytesToHex(Command.check())).toBe("ce2bf21147e1b29f4792f12b7fc99f2d");
  });

  it("matches the Python IMAGE command", () => {
    expect(bytesToHex(Command.image(1))).toBe("0945198d18061fda7c5d4896e5e9df8c");
  });

  it("matches a higher animation command", () => {
    expect(bytesToHex(Command.animation(8))).toBe("22cd34376e3560b21136a9063e6c8dd3");
  });

  it("renders text with the same bytes as Python", () => {
    const hello = TextRenderer.renderText("Hello");

    expect(hello).toHaveLength(45);
    expect(TextRenderer.getDataLength("Hello")).toBe(45);
    expect(TextRenderer.getTextWidth("Hello")).toBe(28);
    expect(bytesToHex(hello)).toBe(
      "204c3f0400043fc4200008030544050340002044203fc4000040002044203fc400004000038404044803000000"
    );
  });

  it("keeps multi-width font entries intact", () => {
    expect(TextRenderer.getCharWidth(TextRenderer.FONT["\u2660"])).toBe(2);
    expect(TextRenderer.getDataLength("\u2660")).toBe(18);
    expect(TextRenderer.getTextWidth("\u2660")).toBe(12);
  });

  it("provides imported bitmap fonts", () => {
    expect(TextRenderer.getTextWidth("ABCDEFG", "ark-pixel-12-mono")).toBeGreaterThan(0);
    expect(TextRenderer.getTextWidth("ABCDEFG", "ark-pixel-16-mono")).toBeGreaterThan(0);
    expect(TextRenderer.getTextWidth("ABCDEFG", "grape-soda")).toBeGreaterThan(0);
    expect(TextRenderer.getTextWidth("ABCDEFG", "modern-dos-8x16")).toBeGreaterThan(0);
    expect(TextRenderer.getTextWidth("ABCDEFG", "kakwa-12")).toBeGreaterThan(0);
    expect(TextRenderer.getTextWidth("ABCDEFG", "kakwa-12-bold")).toBeGreaterThan(0);
  });

  it("renders imported bitmap fonts into badge bytes", () => {
    expect(TextRenderer.renderText("HELLO", "ark-pixel-12-mono")).toHaveLength(45);
    expect(TextRenderer.renderText("HELLO", "ark-pixel-16-mono")).toHaveLength(
      TextRenderer.getDataLength("HELLO", "ark-pixel-16-mono")
    );
    expect(TextRenderer.renderText("HELLO", "grape-soda")).toHaveLength(
      TextRenderer.getDataLength("HELLO", "grape-soda")
    );
    expect(TextRenderer.renderText("HELLO", "modern-dos-8x16")).toHaveLength(
      TextRenderer.getDataLength("HELLO", "modern-dos-8x16")
    );
    expect(TextRenderer.renderText("HELLO", "kakwa-12")).toHaveLength(45);
    expect(TextRenderer.renderText("HELLO", "kakwa-12-bold")).toHaveLength(45);
  });

  it("keeps Ark Pixel 16 descenders lower than regular letters", () => {
    expect(TextRenderer.getGlyphColumns("A", "ark-pixel-16-mono")).toEqual([
      896, 112, 76, 67, 76, 112, 896
    ]);
    expect(TextRenderer.getGlyphColumns("a", "ark-pixel-16-mono")).toEqual([
      384, 584, 584, 584, 584, 1008
    ]);

    for (const character of ["g", "j", "p", "q", "y"]) {
      const columns = TextRenderer.getGlyphColumns(character, "ark-pixel-16-mono");
      expect(columns.some((column) => (column & (1 << 11)) !== 0)).toBe(true);
    }
  });

  it("keeps hand-tuned Ark Pixel 16 uppercase umlaut dots visible", () => {
    expect(TextRenderer.getGlyphColumns("Ä", "ark-pixel-16-mono")).toEqual([
      897, 112, 76, 67, 76, 112, 897
    ]);
    expect(TextRenderer.getGlyphColumns("Ö", "ark-pixel-16-mono")).toEqual([
      253, 258, 513, 513, 513, 258, 253
    ]);
    expect(TextRenderer.getGlyphColumns("Ü", "ark-pixel-16-mono")).toEqual([
      255, 256, 513, 512, 513, 256, 255
    ]);
  });

  it("keeps Modern DOS composite and baseline glyphs visible", () => {
    for (const character of [":", ";", "_"]) {
      expect(TextRenderer.getGlyphColumns(character, "modern-dos-8x16")).not.toHaveLength(0);
      expect(
        TextRenderer.getGlyphColumns(character, "modern-dos-8x16").some((column) => column !== 0)
      ).toBe(true);
    }
  });

  it("renders supported emoji and symbols inside normal text", () => {
    expect(TextRenderer.getGlyphColumns("\u{1F642}", "ark-pixel-12-mono")).not.toHaveLength(0);
    expect(TextRenderer.getTextWidth("Hi \u{1F642}", "ark-pixel-12-mono")).toBeGreaterThan(
      TextRenderer.getTextWidth("Hi", "ark-pixel-12-mono")
    );
    expect(TextRenderer.renderText("Hi \u{1F642}", "ark-pixel-12-mono")).toHaveLength(
      TextRenderer.getDataLength("Hi \u{1F642}", "ark-pixel-12-mono")
    );
  });

  it("matches multi-codepoint heart symbols before single code points", () => {
    expect(TextRenderer.tokenizeText("\u2764\uFE0F")).toEqual(["\u2764\uFE0F"]);
    expect(TextRenderer.getGlyphColumns("\u2764\uFE0F", "ark-pixel-12-mono")).toEqual(
      TextRenderer.getGlyphColumns("\u2764", "ark-pixel-12-mono")
    );
  });

  it("falls back for unsupported emoji without hiding the whole text", () => {
    expect(TextRenderer.getGlyphColumns("\u{1F9EA}", "ark-pixel-12-mono")).toEqual(
      TextRenderer.getGlyphColumns("?", "ark-pixel-12-mono")
    );
    expect(TextRenderer.getTextWidth("\u{1F9EA}", "ark-pixel-12-mono")).toBeGreaterThan(0);
  });

  it("adjusts space width around the font default", () => {
    const compact = TextRenderer.getTextWidth("A A", {
      fontId: "ark-pixel-12-mono",
      spaceWidthAdjustment: -2
    });
    const normal = TextRenderer.getTextWidth("A A", {
      fontId: "ark-pixel-12-mono",
      spaceWidthAdjustment: 0
    });
    const wide = TextRenderer.getTextWidth("A A", {
      fontId: "ark-pixel-12-mono",
      spaceWidthAdjustment: 2
    });

    expect(compact).toBeLessThan(normal);
    expect(wide).toBeGreaterThan(normal);
  });

  it("uses tuned font-specific space width defaults", () => {
    expect(TextRenderer.getSpaceWidth("classic")).toBe(4);
    expect(TextRenderer.getSpaceWidth("ark-pixel-12-mono")).toBe(4);
    expect(TextRenderer.getSpaceWidth("kakwa-12")).toBe(4);
    expect(TextRenderer.getSpaceWidth("kakwa-12-bold")).toBe(4);
    expect(TextRenderer.getSpaceWidth("ark-pixel-16-mono")).toBe(5);
    expect(TextRenderer.getSpaceWidth("modern-dos-8x16")).toBe(5);
    expect(TextRenderer.getSpaceWidth("grape-soda")).toBe(5);
  });

  it("keeps every picker symbol renderable", () => {
    for (const item of SYMBOL_PICKER_ITEMS) {
      for (const sequence of Object.values(item.variants)) {
        expect(TextRenderer.getGlyphColumns(sequence, "ark-pixel-12-mono")).not.toHaveLength(0);
      }
    }
  });

  it("uses the large spiral for both picker sizes", () => {
    const spiral = SYMBOL_PICKER_ITEMS.find((item) => item.label === "Spiral");

    expect(spiral?.variants.small).toBe("\u{1F300}");
    expect(spiral?.variants.large).toBe(`\u{1F300}${LARGE_SYMBOL_MARKER}`);
    expect(TextRenderer.getGlyphColumns("\u{1F300}", "ark-pixel-12-mono")).not.toHaveLength(0);
  });

  it("uses the same heart symbol for both picker sizes", () => {
    const heart = SYMBOL_PICKER_ITEMS.find((item) => item.label === "Heart");

    expect(heart?.display).toBe("\u2764");
    expect(heart?.variants.small).toBe("\u2764");
    expect(heart?.variants.large).toBe(`\u2764${LARGE_SYMBOL_MARKER}`);
    expect(
      TextRenderer.getGlyphColumns(`\u2764${LARGE_SYMBOL_MARKER}`, "ark-pixel-12-mono").length
    ).toBeGreaterThan(
      TextRenderer.getGlyphColumns("\u2764", "ark-pixel-12-mono").length
    );
  });

  it("uses the displayed picker symbol plus one shared large marker for large variants", () => {
    for (const item of SYMBOL_PICKER_ITEMS) {
      expect(item.variants.small).toBe(item.display);
      expect(item.variants.large).toBe(`${item.display}${LARGE_SYMBOL_MARKER}`);
    }
  });

  it("matches the Python upload packet encryption", () => {
    const packets = ImageUpload.buildPackets(TextRenderer.renderText("Hi"));

    expect(packets).toHaveLength(2);
    expect(bytesToHex(packets[0]!)).toBe("6447ea902c1af14a5e272de48501dd4d");
  });
});
