import { BADGE_IMAGE_WIDTH } from "./custom-image";

const PIXEL_GAP = 1;
const MAX_PIXEL_SIZE = 14;
const MIN_PIXEL_SIZE = 4;

export function getPixelSize(containerWidth: number): number {
  const gridGaps = (BADGE_IMAGE_WIDTH - 1) * PIXEL_GAP;
  const availableWidth = Math.max(0, containerWidth - gridGaps - 2);
  const fittedSize = Math.floor(availableWidth / BADGE_IMAGE_WIDTH);
  return Math.min(MAX_PIXEL_SIZE, Math.max(MIN_PIXEL_SIZE, fittedSize));
}
