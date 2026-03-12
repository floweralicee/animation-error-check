import sharp from 'sharp';
import { FrameMotionVectors, MotionVector } from '../types';

const ANALYSIS_WIDTH = 320;
const ANALYSIS_HEIGHT = 240;
const BLOCK_SIZE = 16;
const SEARCH_RANGE = 8;

/**
 * Load a frame as a grayscale raw pixel buffer at analysis resolution.
 */
async function loadGrayscaleBuffer(framePath: string): Promise<Buffer> {
  const { data } = await sharp(framePath)
    .grayscale()
    .resize(ANALYSIS_WIDTH, ANALYSIS_HEIGHT, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  return data;
}

/**
 * Get pixel value from a grayscale buffer at (x, y).
 */
function getPixel(buf: Buffer, x: number, y: number, width: number): number {
  if (x < 0 || x >= width || y < 0 || y >= ANALYSIS_HEIGHT) return 0;
  return buf[y * width + x];
}

/**
 * Check if a block has enough foreground pixels to be worth analyzing.
 * A block with mostly background pixels would produce noise.
 */
function blockHasForeground(
  mask: Buffer | null,
  blockX: number,
  blockY: number,
  width: number,
  threshold: number = 0.3 // at least 30% of block pixels must be foreground
): boolean {
  if (!mask) return true; // No mask = analyze everything
  let fgCount = 0;
  const total = BLOCK_SIZE * BLOCK_SIZE;
  for (let py = 0; py < BLOCK_SIZE; py++) {
    for (let px = 0; px < BLOCK_SIZE; px++) {
      const ax = blockX * BLOCK_SIZE + px;
      const ay = blockY * BLOCK_SIZE + py;
      if (ax < width && ay < ANALYSIS_HEIGHT && mask[ay * width + ax] > 0) {
        fgCount++;
      }
    }
  }
  return fgCount / total >= threshold;
}

/**
 * Compute SAD (Sum of Absolute Differences) between a block in frame A
 * and a displaced block in frame B, optionally masked to foreground.
 */
function computeSAD(
  bufA: Buffer,
  bufB: Buffer,
  maskA: Buffer | null,
  blockX: number,
  blockY: number,
  dx: number,
  dy: number,
  width: number
): number {
  let sad = 0;
  let count = 0;
  for (let py = 0; py < BLOCK_SIZE; py++) {
    for (let px = 0; px < BLOCK_SIZE; px++) {
      const ax = blockX * BLOCK_SIZE + px;
      const ay = blockY * BLOCK_SIZE + py;

      // If mask exists, only compare foreground pixels
      if (maskA && (ax >= width || ay >= ANALYSIS_HEIGHT || maskA[ay * width + ax] === 0)) {
        continue;
      }

      const bx = ax + dx;
      const by = ay + dy;
      sad += Math.abs(getPixel(bufA, ax, ay, width) - getPixel(bufB, bx, by, width));
      count++;
    }
  }
  // Normalize by pixel count to handle partially-masked blocks
  return count > 0 ? (sad / count) * BLOCK_SIZE * BLOCK_SIZE : Infinity;
}

/**
 * Find the best motion vector for a single block using exhaustive block matching.
 */
function matchBlock(
  bufA: Buffer,
  bufB: Buffer,
  maskA: Buffer | null,
  blockX: number,
  blockY: number,
  width: number
): MotionVector {
  let bestDx = 0;
  let bestDy = 0;
  let bestSad = Infinity;

  for (let dy = -SEARCH_RANGE; dy <= SEARCH_RANGE; dy++) {
    for (let dx = -SEARCH_RANGE; dx <= SEARCH_RANGE; dx++) {
      const sad = computeSAD(bufA, bufB, maskA, blockX, blockY, dx, dy, width);
      if (sad < bestSad) {
        bestSad = sad;
        bestDx = dx;
        bestDy = dy;
      }
    }
  }

  return {
    bx: blockX,
    by: blockY,
    dx: bestDx,
    dy: bestDy,
    magnitude: Math.sqrt(bestDx * bestDx + bestDy * bestDy),
    sad: bestSad,
  };
}

/**
 * Compute motion vectors between two consecutive frames.
 * If foreground masks are provided, only foreground blocks are analyzed.
 */
function computeFramePairMotionVectors(
  bufA: Buffer,
  bufB: Buffer,
  maskA: Buffer | null,
  frameA: number,
  frameB: number
): FrameMotionVectors {
  const gridCols = Math.floor(ANALYSIS_WIDTH / BLOCK_SIZE);
  const gridRows = Math.floor(ANALYSIS_HEIGHT / BLOCK_SIZE);
  const vectors: MotionVector[] = [];

  for (let by = 0; by < gridRows; by++) {
    for (let bx = 0; bx < gridCols; bx++) {
      // Skip blocks that are mostly background
      if (!blockHasForeground(maskA, bx, by, ANALYSIS_WIDTH)) {
        // Still push a zero-motion vector to keep grid consistent
        vectors.push({ bx, by, dx: 0, dy: 0, magnitude: 0, sad: 0 });
        continue;
      }
      vectors.push(matchBlock(bufA, bufB, maskA, bx, by, ANALYSIS_WIDTH));
    }
  }

  return {
    frameA,
    frameB,
    vectors,
    gridCols,
    gridRows,
    blockSize: BLOCK_SIZE,
  };
}

/**
 * Compute motion vectors for all consecutive frame pairs.
 * Supports optional foreground masks from MatAnyone2 or temporal-diff.
 *
 * @param framePaths — paths to extracted frame PNGs
 * @param frameNumbers — frame numbers corresponding to each path
 * @param maskedFrames — optional pre-masked grayscale buffers (from foreground.ts)
 * @param masks — optional binary foreground masks (from foreground.ts)
 */
export async function computeAllMotionVectors(
  framePaths: string[],
  frameNumbers: number[],
  maskedFrames?: Buffer[],
  masks?: Buffer[]
): Promise<FrameMotionVectors[]> {
  if (framePaths.length < 2) return [];

  // Use pre-masked frames if available, otherwise load from disk
  const buffers: Buffer[] = [];
  if (maskedFrames && maskedFrames.length === framePaths.length) {
    buffers.push(...maskedFrames);
  } else {
    for (const fp of framePaths) {
      buffers.push(await loadGrayscaleBuffer(fp));
    }
  }

  const results: FrameMotionVectors[] = [];
  for (let i = 0; i < buffers.length - 1; i++) {
    const mask = masks && masks.length > i ? masks[i] : null;
    results.push(
      computeFramePairMotionVectors(buffers[i], buffers[i + 1], mask, frameNumbers[i], frameNumbers[i + 1])
    );
  }

  return results;
}
