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
 * Accepts preloaded grayscale buffers to avoid redundant disk reads.
 */
async function buildBackgroundModel(
  framePaths: string[],
  preloadedBuffers?: Buffer[]
): Promise<Buffer> {
  // Sample up to 8 frames spread across the clip
  const step = Math.max(1, Math.floor(framePaths.length / 8));
  const sampleIndices = framePaths
    .map((_, i) => i)
    .filter((i) => i % step === 0)
    .slice(0, 8);

  let buffers: Buffer[];
  if (preloadedBuffers) {
    buffers = sampleIndices.map((i) => preloadedBuffers[i]);
  } else {
    buffers = await Promise.all(
      sampleIndices.map(async (i) => {
        const { data } = await sharp(framePaths[i])
          .grayscale()
          .resize(ANALYSIS_WIDTH, ANALYSIS_HEIGHT, { fit: 'fill' })
          .raw()
          .toBuffer({ resolveWithObject: true });
        return data;
      })
    );
  }

  const pixelCount = ANALYSIS_WIDTH * ANALYSIS_HEIGHT;
  const bgModel = Buffer.alloc(pixelCount);
  const tmp = new Uint8Array(buffers.length);

  for (let p = 0; p < pixelCount; p++) {
    for (let k = 0; k < buffers.length; k++) tmp[k] = buffers[k][p];
    tmp.sort();
    bgModel[p] = tmp[Math.floor(buffers.length / 2)];
  }

  return bgModel;
}

/**
 * Generate foreground mask and masked frame in a single pass from a preloaded buffer.
 * Returns both the binary mask and the masked grayscale frame.
 */
function processFrameBuffer(
  frameBuffer: Buffer,
  bgModel: Buffer
): { mask: Buffer; masked: Buffer; ratio: number } {
  const mask = Buffer.alloc(frameBuffer.length);
  const masked = Buffer.alloc(frameBuffer.length);
  let fgPixels = 0;

  for (let i = 0; i < frameBuffer.length; i++) {
    const isFg = Math.abs(frameBuffer[i] - bgModel[i]) > FG_THRESHOLD;
    mask[i] = isFg ? 255 : 0;
    masked[i] = isFg ? frameBuffer[i] : 0;
    if (isFg) fgPixels++;
  }

  return { mask, masked, ratio: Math.round((fgPixels / frameBuffer.length) * 1000) / 1000 };
}

/**
 * Load a single frame as a grayscale buffer at analysis resolution.
 */
async function loadFrameBuffer(framePath: string): Promise<Buffer> {
  const { data } = await sharp(framePath)
    .grayscale()
    .resize(ANALYSIS_WIDTH, ANALYSIS_HEIGHT, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  return data;
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
 * Accepts preloaded grayscale buffers to avoid redundant disk reads.
 */
export async function extractForeground(
  framePaths: string[],
  preloadedBuffers?: Buffer[]
): Promise<ForegroundResult> {
  if (framePaths.length < 2) {
    throw new Error('Need at least 2 frames for foreground extraction');
  }

  // Load all frame buffers once if not preloaded
  const frameBuffers = preloadedBuffers ?? await Promise.all(framePaths.map(loadFrameBuffer));

  const bgModel = await buildBackgroundModel(framePaths, frameBuffers);

  const results = frameBuffers.map((buf) => processFrameBuffer(buf, bgModel));

  return {
    masks: results.map((r) => r.mask),
    maskedFrames: results.map((r) => r.masked),
    bgModel,
    fgRatios: results.map((r) => r.ratio),
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

  const results = await Promise.all(
    Array.from({ length: count }, async (_, i) => {
      const [alphaBuf, fgrBuf] = await Promise.all([
        sharp(path.join(phaDir, phaFiles[i]))
          .grayscale()
          .resize(ANALYSIS_WIDTH, ANALYSIS_HEIGHT, { fit: 'fill' })
          .raw()
          .toBuffer({ resolveWithObject: true })
          .then(({ data }) => data),
        sharp(path.join(fgrDir, fgrFiles[i]))
          .grayscale()
          .resize(ANALYSIS_WIDTH, ANALYSIS_HEIGHT, { fit: 'fill' })
          .raw()
          .toBuffer({ resolveWithObject: true })
          .then(({ data }) => data),
      ]);

      const mask = Buffer.alloc(alphaBuf.length);
      for (let p = 0; p < alphaBuf.length; p++) {
        mask[p] = alphaBuf[p] > 128 ? 255 : 0;
      }

      const masked = Buffer.alloc(fgrBuf.length);
      let fgPixels = 0;
      for (let p = 0; p < fgrBuf.length; p++) {
        masked[p] = mask[p] > 0 ? fgrBuf[p] : 0;
        if (mask[p] > 0) fgPixels++;
      }

      const ratio = Math.round((fgPixels / mask.length) * 1000) / 1000;
      return { mask, masked, ratio };
    })
  );

  const masks = results.map((r) => r.mask);
  const maskedFrames = results.map((r) => r.masked);
  const fgRatios = results.map((r) => r.ratio);

  return {
    masks,
    maskedFrames,
    bgModel: Buffer.alloc(0),
    fgRatios,
    method: 'matanyone2',
  };
}
