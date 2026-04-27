import arkPixelMonoRawFont from "./ark-pixel-12-mono-latin.json";
import arkPixelMono16ColumnsRawFont from "./ark-pixel-16-mono-columns.json";
import grapeSodaColumnsRawFont from "./grape-soda-columns.json";
import modernDos8x16ColumnsRawFont from "./modern-dos-8x16-columns.json";
import rawFont from "./font.json";
import kakwaBoldRawFont from "./kakwafont-12-b.json";
import kakwaRawFont from "./kakwafont-12-n.json";
import { SYMBOL_GLYPHS, SYMBOL_SEQUENCES } from "./symbols";

type FontSegment = number[];
type FontCharacter = FontSegment | FontSegment[];
type FontMap = Record<string, FontCharacter>;
type ColumnFontMap = Record<string, number[]>;

const TEXT_SEGMENT_WIDTH = 6;
const TEXT_SEGMENT_HEIGHT = 12;
const BYTE_MAP = [0, 2, 3, 5, 6, 8] as const;
const NIBBLE_BYTE_MAP = [1, 1, 4, 4, 7, 7] as const;
const DEFAULT_LETTER_SPACING = 1;
const DEFAULT_SPACE_WIDTH = 4;
const MIN_SPACE_WIDTH = 1;

export type TextFontOption = {
  id: string;
  label: string;
  license: string;
  note: string;
  source: "bitmap";
};

export type TextLayoutOptions = {
  fontId?: string;
  letterSpacing?: number;
  spaceWidthAdjustment?: number;
};

function isNumberArray(value: FontCharacter): value is FontSegment {
  return Array.isArray(value) && (value.length === 0 || typeof value[0] === "number");
}

function isMultiWidth(charData: FontCharacter | undefined): charData is FontSegment[] {
  return Array.isArray(charData) && charData.length > 0 && Array.isArray(charData[0]);
}

function getSegments(charData: FontCharacter | undefined): FontSegment[] {
  if (charData === undefined) {
    return [new Array<number>(9).fill(0)];
  }

  if (isMultiWidth(charData)) {
    return charData;
  }

  if (isNumberArray(charData)) {
    return [charData];
  }

  return [new Array<number>(9).fill(0)];
}

function decodeSegmentPixel(segment: FontSegment, column: number, row: number): boolean {
  if (row < 8) {
    const byteIndex = BYTE_MAP[column]!;
    const bit = 7 - row;
    return (((segment[byteIndex] ?? 0) >> bit) & 1) === 1;
  }

  const byteIndex = NIBBLE_BYTE_MAP[column]!;
  const isUpperNibble = column % 2 === 0;
  const rowInNibble = row - 8;
  const bit = isUpperNibble ? 7 - rowInNibble : 3 - rowInNibble;
  return (((segment[byteIndex] ?? 0) >> bit) & 1) === 1;
}

function encodeSegmentPixel(segment: FontSegment, column: number, row: number, value: boolean): void {
  if (row < 8) {
    const byteIndex = BYTE_MAP[column]!;
    const bit = 7 - row;
    if (value) {
      segment[byteIndex] = (segment[byteIndex] ?? 0) | (1 << bit);
    } else {
      segment[byteIndex] = (segment[byteIndex] ?? 0) & ~(1 << bit);
    }
    return;
  }

  const byteIndex = NIBBLE_BYTE_MAP[column]!;
  const isUpperNibble = column % 2 === 0;
  const rowInNibble = row - 8;
  const bit = isUpperNibble ? 7 - rowInNibble : 3 - rowInNibble;
  if (value) {
    segment[byteIndex] = (segment[byteIndex] ?? 0) | (1 << bit);
  } else {
    segment[byteIndex] = (segment[byteIndex] ?? 0) & ~(1 << bit);
  }
}

function trimColumns(columns: number[]): number[] {
  let left = 0;
  let right = columns.length - 1;

  while (left <= right && columns[left] === 0) {
    left += 1;
  }

  while (right >= left && columns[right] === 0) {
    right -= 1;
  }

  if (right < left) {
    return [];
  }

  return columns.slice(left, right + 1);
}

function decodeCharacterToColumns(charData: FontCharacter | undefined): number[] {
  const segments = getSegments(charData);
  const columns: number[] = [];

  for (const segment of segments) {
    for (let column = 0; column < TEXT_SEGMENT_WIDTH; column += 1) {
      let mask = 0;

      for (let row = 0; row < TEXT_SEGMENT_HEIGHT; row += 1) {
        if (decodeSegmentPixel(segment, column, row)) {
          mask |= 1 << row;
        }
      }

      columns.push(mask);
    }
  }

  return trimColumns(columns);
}

function encodeColumnsToSegments(columns: number[]): Uint8Array {
  const segmentCount = Math.max(1, Math.ceil(columns.length / TEXT_SEGMENT_WIDTH));
  const bytes: number[] = [];

  for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex += 1) {
    const segment = new Array<number>(9).fill(0);
    const startColumn = segmentIndex * TEXT_SEGMENT_WIDTH;

    for (let localColumn = 0; localColumn < TEXT_SEGMENT_WIDTH; localColumn += 1) {
      const mask = columns[startColumn + localColumn] ?? 0;

      for (let row = 0; row < TEXT_SEGMENT_HEIGHT; row += 1) {
        const isLit = ((mask >> row) & 1) === 1;
        encodeSegmentPixel(segment, localColumn, row, isLit);
      }
    }

    bytes.push(...segment);
  }

  return Uint8Array.from(bytes);
}

function buildColumnFontMap(fontMap: FontMap): ColumnFontMap {
  return Object.fromEntries(
    Object.entries(fontMap).map(([character, charData]) => [
      character,
      decodeCharacterToColumns(charData)
    ])
  );
}

function normalizeColumnFontMap(fontMap: ColumnFontMap): ColumnFontMap {
  return Object.fromEntries(
    Object.entries(fontMap).map(([character, columns]) => [
      character,
      character === " " ? columns : trimColumns(columns)
    ])
  );
}

function clampSpacing(value: number | undefined): number {
  const resolved = value ?? DEFAULT_LETTER_SPACING;
  return Math.max(0, Math.floor(resolved));
}

function clampSpaceWidthAdjustment(value: number | undefined): number {
  const resolved = value ?? 0;
  return Math.floor(resolved);
}

function isFallbackSymbolCandidate(character: string): boolean {
  return !/^[\u0020-\u007E]$/.test(character);
}

export class TextRenderer {
  static readonly FONT: FontMap = rawFont as FontMap;
  static readonly ARK_PIXEL_MONO_FONT: FontMap = arkPixelMonoRawFont as FontMap;
  static readonly KAKWA_FONT: FontMap = kakwaRawFont as FontMap;
  static readonly KAKWA_BOLD_FONT: FontMap = kakwaBoldRawFont as FontMap;

  static readonly CLASSIC_COLUMN_FONT: ColumnFontMap = buildColumnFontMap(TextRenderer.FONT);
  static readonly ARK_PIXEL_MONO_COLUMN_FONT: ColumnFontMap = buildColumnFontMap(
    TextRenderer.ARK_PIXEL_MONO_FONT
  );
  static readonly KAKWA_COLUMN_FONT: ColumnFontMap = buildColumnFontMap(TextRenderer.KAKWA_FONT);
  static readonly KAKWA_BOLD_COLUMN_FONT: ColumnFontMap = buildColumnFontMap(
    TextRenderer.KAKWA_BOLD_FONT
  );
  static readonly ARK_PIXEL_MONO_16_COLUMN_FONT: ColumnFontMap =
    normalizeColumnFontMap(arkPixelMono16ColumnsRawFont as ColumnFontMap);
  static readonly GRAPE_SODA_COLUMN_FONT: ColumnFontMap =
    normalizeColumnFontMap(grapeSodaColumnsRawFont as ColumnFontMap);
  static readonly MODERN_DOS_8X16_COLUMN_FONT: ColumnFontMap =
    normalizeColumnFontMap(modernDos8x16ColumnsRawFont as ColumnFontMap);

  static readonly COLUMN_FONT_MAPS: Record<string, ColumnFontMap> = {
    classic: TextRenderer.CLASSIC_COLUMN_FONT,
    "ark-pixel-12-mono": TextRenderer.ARK_PIXEL_MONO_COLUMN_FONT,
    "ark-pixel-16-mono": TextRenderer.ARK_PIXEL_MONO_16_COLUMN_FONT,
    "grape-soda": TextRenderer.GRAPE_SODA_COLUMN_FONT,
    "modern-dos-8x16": TextRenderer.MODERN_DOS_8X16_COLUMN_FONT,
    "kakwa-12": TextRenderer.KAKWA_COLUMN_FONT,
    "kakwa-12-bold": TextRenderer.KAKWA_BOLD_COLUMN_FONT
  };

  static readonly SPACE_WIDTHS: Record<string, number> = {
    classic: 4,
    "ark-pixel-12-mono": 4,
    "ark-pixel-16-mono": 5,
    "grape-soda": 5,
    "modern-dos-8x16": 5,
    "kakwa-12": 4,
    "kakwa-12-bold": 4
  };

  static readonly BYTES_PER_SEGMENT = 9;

  static readonly TEXT_FONT_OPTIONS: TextFontOption[] = [
    {
      id: "classic",
      label: "Classic Badge Font",
      license: "Project bitmap data / reverse-engineered reference",
      note: "Original ble-led-badge bitmap font.",
      source: "bitmap"
    },
    {
      id: "ark-pixel-12-mono",
      label: "Ark Pixel 12 Mono",
      license: "SIL Open Font License 1.1",
      note: "Imported Ark Pixel monospaced Latin with preserved baseline alignment.",
      source: "bitmap"
    },
    {
      id: "ark-pixel-16-mono",
      label: "Ark Pixel 16 Mono",
      license: "SIL Open Font License 1.1",
      note: "Imported from Ark Pixel 16px monospaced as exact 8-column glyphs, shifted up into the 12-row badge window while keeping g/j/p/q/y descenders on their source baseline.",
      source: "bitmap"
    },
    {
      id: "modern-dos-8x16",
      label: "Modern DOS 8x16",
      license: "CC0 1.0 Universal",
      note: "Imported from ModernDOS8x16.ttf, cropped to the 12-row badge window and packed losslessly into badge segments.",
      source: "bitmap"
    },
    {
      id: "grape-soda",
      label: "Grape Soda",
      license: "CC BY 4.0",
      note: "Imported pixel-exact from the 8x16-style Grape Soda TTF and packed losslessly into badge segments. Attribution required.",
      source: "bitmap"
    },
    {
      id: "kakwa-12",
      label: "KakwaFont 12 Normal",
      license: "SIL Open Font License 1.1",
      note: "Imported from kakwa/kakwafont, a compact true 12px bitmap font.",
      source: "bitmap"
    },
    {
      id: "kakwa-12-bold",
      label: "KakwaFont 12 Bold",
      license: "SIL Open Font License 1.1",
      note: "Imported bold companion of KakwaFont 12.",
      source: "bitmap"
    }
  ];

  static isMultiWidth(charData: FontCharacter | undefined): charData is FontSegment[] {
    return isMultiWidth(charData);
  }

  static getCharWidth(charData: FontCharacter | undefined): number {
    if (charData === undefined) {
      return 1;
    }

    return TextRenderer.isMultiWidth(charData) ? charData.length : 1;
  }

  static getSegments(charData: FontCharacter | undefined): FontSegment[] {
    return getSegments(charData);
  }

  static getFontOption(fontId: string): TextFontOption {
    return (
      TextRenderer.TEXT_FONT_OPTIONS.find((option) => option.id === fontId) ??
      TextRenderer.TEXT_FONT_OPTIONS[0]!
    );
  }

  static getColumnFontMap(fontId: string): ColumnFontMap {
    return TextRenderer.COLUMN_FONT_MAPS[fontId] ?? TextRenderer.CLASSIC_COLUMN_FONT;
  }

  static getSpaceWidth(fontId: string, adjustment = 0): number {
    const baseWidth = TextRenderer.SPACE_WIDTHS[fontId] ?? DEFAULT_SPACE_WIDTH;
    return Math.max(MIN_SPACE_WIDTH, baseWidth + clampSpaceWidthAdjustment(adjustment));
  }

  static getGlyphColumns(
    character: string,
    fontId = "classic",
    spaceWidthAdjustment = 0
  ): number[] {
    const symbol = SYMBOL_GLYPHS[character];
    if (symbol) {
      return trimColumns(symbol.columns);
    }

    const fontMap = TextRenderer.getColumnFontMap(fontId);
    if (character === " ") {
      return new Array<number>(
        TextRenderer.getSpaceWidth(fontId, spaceWidthAdjustment)
      ).fill(0);
    }

    const columns = fontMap[character];
    if (columns) {
      return columns;
    }

    if (isFallbackSymbolCandidate(character)) {
      return fontMap["?"] ?? [];
    }

    return [];
  }

  static tokenizeText(text: string): string[] {
    const tokens: string[] = [];
    let index = 0;

    while (index < text.length) {
      const symbol = SYMBOL_SEQUENCES.find((sequence) =>
        text.startsWith(sequence, index)
      );
      if (symbol) {
        tokens.push(symbol);
        index += symbol.length;
        continue;
      }

      const character = Array.from(text.slice(index))[0] ?? "";
      if (!character) {
        break;
      }

      tokens.push(character);
      index += character.length;
    }

    return tokens;
  }

  static layoutTextColumns(text: string, options: TextLayoutOptions = {}): number[] {
    const fontId = options.fontId ?? "classic";
    const letterSpacing = clampSpacing(options.letterSpacing);
    const spaceWidthAdjustment = clampSpaceWidthAdjustment(
      options.spaceWidthAdjustment
    );
    const columns: number[] = [];
    const characters = TextRenderer.tokenizeText(text);

    for (let index = 0; index < characters.length; index += 1) {
      const character = characters[index]!;
      columns.push(
        ...TextRenderer.getGlyphColumns(character, fontId, spaceWidthAdjustment)
      );

      if (index < characters.length - 1) {
        columns.push(...new Array<number>(letterSpacing).fill(0));
      }
    }

    return columns;
  }

  static async ensureFontLoaded(fontId?: string): Promise<void> {
    void fontId;
    return Promise.resolve();
  }

  static renderText(text: string, fontOrOptions: string | TextLayoutOptions = "classic"): Uint8Array {
    const options =
      typeof fontOrOptions === "string" ? { fontId: fontOrOptions } : fontOrOptions;
    return encodeColumnsToSegments(TextRenderer.layoutTextColumns(text, options));
  }

  static getTextWidth(text: string, fontOrOptions: string | TextLayoutOptions = "classic"): number {
    const options =
      typeof fontOrOptions === "string" ? { fontId: fontOrOptions } : fontOrOptions;
    return TextRenderer.layoutTextColumns(text, options).length;
  }

  static getDataLength(
    text: string,
    fontOrOptions: string | TextLayoutOptions = "classic"
  ): number {
    const width = TextRenderer.getTextWidth(text, fontOrOptions);
    return Math.max(1, Math.ceil(width / TEXT_SEGMENT_WIDTH)) * TextRenderer.BYTES_PER_SEGMENT;
  }
}
