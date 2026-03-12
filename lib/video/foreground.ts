import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';

/**
 * Temporal-differencing foreground segmentation.
 *
 * This is the FALLBACK when MatAnyone2 is not available.
 * It produces a rough foreground mask per frame by comparing against
 * a background model (median of all frames).
 *
 * The masked frames are then used for analysis, filtering out
 * background noise, camera shake, and compression artifacts.
 */

const ANALYSIS_WIDTH = 320;
const ANALYSIS_HEIGHT = 240;
const FG_THRESHOLD = 20; // pixel diff from background model = foreground

/**
 * Build a background model from sampled frames using per-pixel median.
 * More robust than mean (handles occasional foreground in any single frame).
 */
async function buildBackgroundModel(
  framePaths: string[]
): Promise<Buffer> {
  // Sample up to 8 frames spread across the clip
  const step = Math.max(1, Math.floor(framePaths.length / 8));
  const samplePaths = framePaths.filter((_, i) => i % step === 0).slice(0, 8);

  const buffers: Buffer[] = [];
  for (const fp of samplePaths) {
    const { data } = await sharp(fp)
      .grayscale()
      .resize(ANALYSIS_WIDTH, ANALYSIS_HEIGHT, { fit: 'fill' })
      .raw()
      .toBuffer({ resolveWithObject: true });
    buffers.push(data);
  }

  const pixelCount = ANALYSIS_WIDTH * ANALYSIS_HEIGHT;
  const bgModel = Buffer.alloc(pixelCount);

  for (let p = 0; p < pixelCount; p++) {
    // Median of this pixel across all samples
    const values = buffers.map((buf) => buf[p]).sort((a, b) => a - b);
    bgModel[p] = values[Math.floor(values.length / 2)];
  }

  return bgModel;
}

/**
 * Generate foreground mask for a single frame.
 * Returns a binary mask buffer (0 or 255) at analysis resolution.
 */
async function generateForegroundMask(
  framePath: string,
  bgModel: Buffer
): Promise<Buffer> {
  const { data } = await sharp(framePath)
    .grayscale()
    .resize(ANALYSIS_WIDTH, ANALYSIS_HEIGHT, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const mask = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i++) {
    mask[i] = Math.abs(data[i] - bgModel[i]) > FG_THRESHOLD ? 255 : 0;
  }

  return mask;
}

/**
 * Apply foreground mask to a frame — zero out background pixels.
 * Returns a masked grayscale frame at analysis resolution.
 */
async function applyMask(
  framePath: string,
  mask: Buffer
): Promise<Buffer> {
  const { data } = await sharp(framePath)
    .grayscale()
    .resize(ANALYSIS_WIDTH, ANALYSIS_HEIGHT, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const masked = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i++) {
    masked[i] = mask[i] > 0 ? data[i] : 0;
  }

  return masked;
}

export interface ForegroundResult {
  /** Per-frame foreground masks (binary, analysis resolution) */
  masks: Buffer[];
  /** Per-frame masked grayscale buffers (analysis resolution) */
  maskedFrames: Buffer[];
  /** Background model used */
  bgModel: Buffer;
  /** Foreground pixel ratio per frame (0-1, how much of the frame is foreground) */
  fgRatios: number[];
  /** Method used */
  method: 'matanyone2' | 'temporal_diff';
}

/**
 * Run temporal-differencing foreground segmentation on all frames.
 */
export async function extractForeground(
  framePaths: string[]
): Promise<ForegroundResult> {
  if (framePaths.length < 2) {
    throw new Error('Need at least 2 frames for foreground extraction');
  }

  const bgModel = await buildBackgroundModel(framePaths);
  const masks: Buffer[] = [];
  const maskedFrames: Buffer[] = [];
  const fgRatios: number[] = [];

  for (const fp of framePaths) {
    const mask = await generateForegroundMask(fp, bgModel);
    const masked = await applyMask(fp, mask);

    // Compute foreground ratio
    let fgPixels = 0;
    for (let i = 0; i < mask.length; i++) {
      if (mask[i] > 0) fgPixels++;
    }
    const ratio = fgPixels / mask.length;

    masks.push(mask);
    maskedFrames.push(masked);
    fgRatios.push(Math.round(ratio * 1000) / 1000);
  }

  return {
    masks,
    maskedFrames,
    bgModel,
    fgRatios,
    method: 'temporal_diff',
  };
}

/**
 * Load foreground frames from MatAnyone2 output directory.
 * The alpha matte frames are used as masks.
 */
export async function loadMatAnyone2Foreground(
  fgrDir: string,
  phaDir: string,
  frameCount: number
): Promise<ForegroundResult> {
  const fgrFiles = (await fs.readdir(fgrDir)).filter((f) => f.endsWith('.png')).sort();
  const phaFiles = (await fs.readdir(phaDir)).filter((f) => f.endsWith('.png')).sort();

  const count = Math.min(fgrFiles.length, phaFiles.length, frameCount);
  const masks: Buffer[] = [];
  const maskedFrames: Buffer[] = [];
  const fgRatios: number[] = [];

  for (let i = 0; i < count; i++) {
    // Load alpha matte as mask
    const { data: alphaBuf } = await sharp(path.join(phaDir, phaFiles[i]))
      .grayscale()
      .resize(ANALYSIS_WIDTH, ANALYSIS_HEIGHT, { fit: 'fill' })
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Threshold alpha to binary mask
    const mask = Buffer.alloc(alphaBuf.length);
    for (let p = 0; p < alphaBuf.length; p++) {
      mask[p] = alphaBuf[p] > 128 ? 255 : 0;
    }

    // Load foreground frame
    const { data: fgrBuf } = await sharp(path.join(fgrDir, fgrFiles[i]))
      .grayscale()
      .resize(ANALYSIS_WIDTH, ANALYSIS_HEIGHT, { fit: 'fill' })
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Apply mask to foreground
    const masked = Buffer.alloc(fgrBuf.length);
    for (let p = 0; p < fgrBuf.length; p++) {
      masked[p] = mask[p] > 0 ? fgrBuf[p] : 0;
    }

    let fgPixels = 0;
    for (let p = 0; p < mask.length; p++) {
      if (mask[p] > 0) fgPixels++;
    }

    masks.push(mask);
    maskedFrames.push(masked);
    fgRatios.push(Math.round((fgPixels / mask.length) * 1000) / 1000);
  }

  return {
    masks,
    maskedFrames,
    bgModel: Buffer.alloc(0),
    fgRatios,
    method: 'matanyone2',
  };
}
