import sharp from 'sharp';
import { BrightnessStats } from '../types';

/**
 * Compute per-frame mean brightness and overall stats.
 * Uses grayscale conversion — mean pixel value approximates perceived brightness.
 */
export async function computeBrightness(
  framePaths: string[],
  frameNumbers: number[]
): Promise<BrightnessStats> {
  const perFrame: { frame: number; mean: number }[] = [];

  for (let i = 0; i < framePaths.length; i++) {
    const stats = await sharp(framePaths[i]).grayscale().stats();
    // stats.channels[0] is the grayscale channel
    const mean = Math.round(stats.channels[0].mean * 100) / 100;
    perFrame.push({ frame: frameNumbers[i], mean });
  }

  const means = perFrame.map((f) => f.mean);
  const min = Math.min(...means);
  const max = Math.max(...means);
  const avg = means.reduce((a, b) => a + b, 0) / means.length;
  const variance = means.reduce((sum, v) => sum + (v - avg) ** 2, 0) / means.length;
  const stddev = Math.sqrt(variance);

  return {
    perFrame,
    overall: {
      min: Math.round(min * 100) / 100,
      max: Math.round(max * 100) / 100,
      mean: Math.round(avg * 100) / 100,
      stddev: Math.round(stddev * 100) / 100,
    },
  };
}
