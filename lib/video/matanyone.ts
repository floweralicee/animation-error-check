import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';

/**
 * MatAnyone2 integration for foreground isolation.
 *
 * MatAnyone2 (https://github.com/pq-yang/MatAnyone2) is a video matting model
 * that produces clean foreground + alpha matte from video + first-frame mask.
 *
 * This module:
 * 1. Checks if MatAnyone2 is available (Python env + model)
 * 2. Auto-generates a first-frame mask from temporal differencing
 * 3. Runs MatAnyone2 inference
 * 4. Returns paths to foreground frames
 *
 * If MatAnyone2 is not available, the pipeline falls back to temporal-diff
 * foreground segmentation (see foreground.ts).
 */

const MATANYONE2_DIR = process.env.MATANYONE2_DIR || '';
const MATANYONE2_PYTHON = process.env.MATANYONE2_PYTHON || 'python';

/**
 * Check if MatAnyone2 is available in the environment.
 */
export async function isMatAnyone2Available(): Promise<boolean> {
  if (!MATANYONE2_DIR) return false;

  try {
    await fs.access(path.join(MATANYONE2_DIR, 'inference_matanyone2.py'));
    return true;
  } catch {
    return false;
  }
}

/**
 * Auto-generate a first-frame segmentation mask.
 *
 * Strategy: compare frame 0 vs frame N (a few frames later) to find
 * the moving subject. The difference mask approximates the subject region.
 * This is then dilated to give MatAnyone2 a generous initial mask.
 */
export async function generateAutoMask(
  framePaths: string[],
  outputPath: string,
  width: number,
  height: number
): Promise<string> {
  if (framePaths.length < 3) {
    throw new Error('Need at least 3 frames to generate auto-mask');
  }

  const analysisW = Math.min(width, 640);
  const analysisH = Math.min(height, 480);

  // Load first frame and a frame ~10% into the clip (or frame 3, whichever is later)
  const refIdx = 0;
  const cmpIdx = Math.min(Math.max(3, Math.floor(framePaths.length * 0.1)), framePaths.length - 1);

  const refBuf = await sharp(framePaths[refIdx])
    .grayscale()
    .resize(analysisW, analysisH, { fit: 'fill' })
    .raw()
    .toBuffer();

  const cmpBuf = await sharp(framePaths[cmpIdx])
    .grayscale()
    .resize(analysisW, analysisH, { fit: 'fill' })
    .raw()
    .toBuffer();

  // Compute absolute difference
  const diffBuf = Buffer.alloc(refBuf.length);
  for (let i = 0; i < refBuf.length; i++) {
    diffBuf[i] = Math.abs(refBuf[i] - cmpBuf[i]);
  }

  // Threshold: pixels with diff > 15 are likely foreground
  const threshold = 15;
  const maskBuf = Buffer.alloc(refBuf.length);
  for (let i = 0; i < diffBuf.length; i++) {
    maskBuf[i] = diffBuf[i] > threshold ? 255 : 0;
  }

  // Dilate the mask (expand by ~8px to give MatAnyone2 generous coverage)
  const dilated = dilateMask(maskBuf, analysisW, analysisH, 8);

  // Save mask as PNG at original resolution
  const maskPath = path.join(outputPath, 'auto_mask.png');
  await sharp(dilated, { raw: { width: analysisW, height: analysisH, channels: 1 } })
    .resize(width, height, { fit: 'fill', kernel: 'nearest' })
    .png()
    .toFile(maskPath);

  return maskPath;
}

/**
 * Simple morphological dilation on a binary mask.
 */
function dilateMask(mask: Buffer, w: number, h: number, radius: number): Buffer {
  const out = Buffer.alloc(mask.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let found = false;
      for (let dy = -radius; dy <= radius && !found; dy++) {
        for (let dx = -radius; dx <= radius && !found; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
            if (mask[ny * w + nx] > 0) found = true;
          }
        }
      }
      out[y * w + x] = found ? 255 : 0;
    }
  }
  return out;
}

/**
 * Run MatAnyone2 on a video to extract foreground frames.
 *
 * @returns Path to directory containing foreground frame PNGs
 */
export async function runMatAnyone2(
  videoPath: string,
  maskPath: string,
  outputDir: string,
  maxSize: number = 480
): Promise<{ fgrDir: string; phaDir: string; success: boolean }> {
  const scriptPath = path.join(MATANYONE2_DIR, 'inference_matanyone2.py');
  const resultDir = path.join(outputDir, 'matanyone2_results');

  await fs.mkdir(resultDir, { recursive: true });

  return new Promise((resolve) => {
    const args = [
      scriptPath,
      '-i', videoPath,
      '-m', maskPath,
      '-o', resultDir,
      '--save_image',
      '--max_size', String(maxSize),
    ];

    const proc = execFile(MATANYONE2_PYTHON, args, {
      timeout: 300000, // 5 minute timeout
      cwd: MATANYONE2_DIR,
    }, async (error) => {
      if (error) {
        console.error('MatAnyone2 failed:', error.message);
        resolve({ fgrDir: '', phaDir: '', success: false });
        return;
      }

      // Find the output directories
      try {
        const resultContents = await fs.readdir(resultDir);
        const videoName = path.basename(videoPath, path.extname(videoPath));

        // MatAnyone2 creates <videoName>/fgr/ and <videoName>/pha/ directories
        let fgrDir = '';
        let phaDir = '';

        for (const item of resultContents) {
          const itemPath = path.join(resultDir, item);
          const stat = await fs.stat(itemPath);
          if (stat.isDirectory()) {
            const subItems = await fs.readdir(itemPath);
            if (subItems.includes('fgr')) fgrDir = path.join(itemPath, 'fgr');
            if (subItems.includes('pha')) phaDir = path.join(itemPath, 'pha');
          }
        }

        resolve({ fgrDir, phaDir, success: fgrDir !== '' });
      } catch {
        resolve({ fgrDir: '', phaDir: '', success: false });
      }
    });
  });
}
