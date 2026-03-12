import sharp from 'sharp';
import { FrameDiffResult } from '../types';

/**
 * Compare consecutive sampled frames by computing normalized pixel difference.
 * Uses sharp to decode images and compare raw pixel buffers.
 *
 * Returns a diff score between 0 (identical) and 1 (maximum difference).
 */
export async function computeFrameDiffs(
  framePaths: string[],
  frameNumbers: number[]
): Promise<FrameDiffResult[]> {
  if (framePaths.length < 2) return [];

  const results: FrameDiffResult[] = [];

  // Pre-load all frames as raw pixel buffers (grayscale for speed)
  const buffers: Buffer[] = [];
  for (const fp of framePaths) {
    const { data } = await sharp(fp)
      .grayscale()
      .resize(320, 240, { fit: 'fill' }) // normalize size for fair comparison
      .raw()
      .toBuffer({ resolveWithObject: true });
    buffers.push(data);
  }

  for (let i = 0; i < buffers.length - 1; i++) {
    const a = buffers[i];
    const b = buffers[i + 1];
    const len = Math.min(a.length, b.length);

    let totalDiff = 0;
    for (let p = 0; p < len; p++) {
      totalDiff += Math.abs(a[p] - b[p]);
    }

    const diffScore = totalDiff / (len * 255); // normalize to 0-1

    results.push({
      frameA: frameNumbers[i],
      frameB: frameNumbers[i + 1],
      diffScore: Math.round(diffScore * 10000) / 10000,
    });
  }

  return results;
}

/**
 * Find the frame transitions with the largest visual changes.
 */
export function findLargestChanges(
  diffs: FrameDiffResult[],
  topN: number = 4
): number[] {
  return [...diffs]
    .sort((a, b) => b.diffScore - a.diffScore)
    .slice(0, topN)
    .map((d) => d.frameB)
    .sort((a, b) => a - b);
}
