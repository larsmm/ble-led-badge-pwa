export const BADGE_IMAGE_WIDTH = 48;
export const BADGE_IMAGE_HEIGHT = 12;
export const BADGE_IMAGE_BYTES = 72;

export type BinaryPixelGrid = boolean[][];

export type BadgeImageAsset = {
  bitmapData: Uint8Array;
  pixelGrid: BinaryPixelGrid;
  previewDataUrl: string;
};

export function clonePixelGrid(grid: BinaryPixelGrid): BinaryPixelGrid {
  return grid.map((row) => [...row]);
}

export function invertPixelGrid(grid: BinaryPixelGrid): BinaryPixelGrid {
  return grid.map((row) => row.map((value) => !value));
}

export function binaryStringsToGrid(rows: string[]): BinaryPixelGrid {
  return rows.map((row) =>
    row
      .padEnd(BADGE_IMAGE_WIDTH, "0")
      .slice(0, BADGE_IMAGE_WIDTH)
      .split("")
      .map((value) => value === "1")
  );
}

export function gridToBinaryStrings(grid: BinaryPixelGrid): string[] {
  return grid.slice(0, BADGE_IMAGE_HEIGHT).map((row) =>
    row
      .slice(0, BADGE_IMAGE_WIDTH)
      .map((value) => (value ? "1" : "0"))
      .join("")
      .padEnd(BADGE_IMAGE_WIDTH, "0")
  );
}

export function encodeBadgeImagePixels(pixels: BinaryPixelGrid): Uint8Array {
  if (pixels.length !== BADGE_IMAGE_HEIGHT) {
    throw new Error(`Badge images must have exactly ${BADGE_IMAGE_HEIGHT} rows.`);
  }

  if (pixels.some((row) => row.length !== BADGE_IMAGE_WIDTH)) {
    throw new Error(`Badge images must have exactly ${BADGE_IMAGE_WIDTH} columns.`);
  }

  const byteMap = [0, 2, 3, 5, 6, 8];
  const nibbleByteMap = [1, 1, 4, 4, 7, 7];
  const allBytes: number[] = [];

  for (let segmentIndex = 0; segmentIndex < BADGE_IMAGE_WIDTH / 6; segmentIndex += 1) {
    const startColumn = segmentIndex * 6;
    const segment = new Array<number>(9).fill(0);

    for (let localColumn = 0; localColumn < 6; localColumn += 1) {
      const column = startColumn + localColumn;
      let byteValue = 0;

      for (let row = 0; row < 8; row += 1) {
        if (pixels[row]?.[column]) {
          byteValue |= 1 << (7 - row);
        }
      }

      segment[byteMap[localColumn]!] = byteValue;

      let nibbleValue = 0;
      for (let row = 8; row < BADGE_IMAGE_HEIGHT; row += 1) {
        if (pixels[row]?.[column]) {
          nibbleValue |= 1 << (11 - row);
        }
      }

      const nibbleByteIndex = nibbleByteMap[localColumn]!;
      if (localColumn % 2 === 0) {
        segment[nibbleByteIndex] |= nibbleValue << 4;
      } else {
        segment[nibbleByteIndex] |= nibbleValue;
      }
    }

    allBytes.push(...segment);
  }

  return Uint8Array.from(allBytes);
}

export function imageDataToBinaryGrid(
  imageData: ImageData,
  threshold: number,
  invert: boolean
): BinaryPixelGrid {
  const rows: BinaryPixelGrid = [];

  for (let row = 0; row < imageData.height; row += 1) {
    const rowPixels: boolean[] = [];

    for (let column = 0; column < imageData.width; column += 1) {
      const pixelIndex = (row * imageData.width + column) * 4;
      const red = imageData.data[pixelIndex] ?? 0;
      const green = imageData.data[pixelIndex + 1] ?? 0;
      const blue = imageData.data[pixelIndex + 2] ?? 0;
      const alpha = imageData.data[pixelIndex + 3] ?? 0;
      const luminance = red * 0.299 + green * 0.587 + blue * 0.114;
      const isLit = alpha > 0 && luminance < threshold;
      rowPixels.push(invert ? !isLit : isLit);
    }

    rows.push(rowPixels);
  }

  return rows;
}

export function createPreviewDataUrl(grid: BinaryPixelGrid, scale = 8): string {
  const canvas = document.createElement("canvas");
  canvas.width = BADGE_IMAGE_WIDTH * scale;
  canvas.height = BADGE_IMAGE_HEIGHT * scale;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas 2D context is not available.");
  }

  context.fillStyle = "#f6efe1";
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let row = 0; row < BADGE_IMAGE_HEIGHT; row += 1) {
    for (let column = 0; column < BADGE_IMAGE_WIDTH; column += 1) {
      context.fillStyle = grid[row]?.[column] ? "#16332b" : "#d9cfbb";
      context.fillRect(column * scale, row * scale, scale - 1, scale - 1);
    }
  }

  return canvas.toDataURL("image/png");
}

export function createMonochromeImageDataUrl(grid: BinaryPixelGrid): string {
  const canvas = document.createElement("canvas");
  canvas.width = BADGE_IMAGE_WIDTH;
  canvas.height = BADGE_IMAGE_HEIGHT;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas 2D context is not available.");
  }

  const imageData = context.createImageData(BADGE_IMAGE_WIDTH, BADGE_IMAGE_HEIGHT);

  for (let row = 0; row < BADGE_IMAGE_HEIGHT; row += 1) {
    for (let column = 0; column < BADGE_IMAGE_WIDTH; column += 1) {
      const pixelIndex = (row * BADGE_IMAGE_WIDTH + column) * 4;
      const color = grid[row]?.[column] ? 0 : 255;
      imageData.data[pixelIndex] = color;
      imageData.data[pixelIndex + 1] = color;
      imageData.data[pixelIndex + 2] = color;
      imageData.data[pixelIndex + 3] = 255;
    }
  }

  context.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}

export function buildBadgeImageAsset(grid: BinaryPixelGrid): BadgeImageAsset {
  const pixelGrid = clonePixelGrid(grid);

  return {
    bitmapData: encodeBadgeImagePixels(pixelGrid),
    pixelGrid,
    previewDataUrl: createPreviewDataUrl(pixelGrid)
  };
}

export async function fileToBadgeImageAsset(
  file: File,
  threshold: number,
  invert: boolean
): Promise<BadgeImageAsset> {
  const bitmap = await createImageBitmap(file);
  const sourceWidth = bitmap.width;
  const sourceHeight = bitmap.height;
  const canvas = document.createElement("canvas");
  canvas.width = BADGE_IMAGE_WIDTH;
  canvas.height = BADGE_IMAGE_HEIGHT;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    bitmap.close();
    throw new Error("Canvas 2D context is not available.");
  }

  context.clearRect(0, 0, BADGE_IMAGE_WIDTH, BADGE_IMAGE_HEIGHT);
  context.drawImage(bitmap, 0, 0, sourceWidth, sourceHeight, 0, 0, BADGE_IMAGE_WIDTH, BADGE_IMAGE_HEIGHT);
  bitmap.close();

  const imageData = context.getImageData(0, 0, BADGE_IMAGE_WIDTH, BADGE_IMAGE_HEIGHT);
  const grid = imageDataToBinaryGrid(imageData, threshold, invert);

  return buildBadgeImageAsset(grid);
}
