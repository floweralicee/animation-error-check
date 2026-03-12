import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs/promises';
import { VideoMetadata } from '../types';

/**
 * Extract evenly-spaced frames from a video for analysis.
 * Returns array of file paths to the extracted PNG frames.
 */
export async function sampleFrames(
  videoPath: string,
  metadata: VideoMetadata,
  outputDir: string,
  sampleCount: number = 24
): Promise<{ paths: string[]; frameNumbers: number[] }> {
  await fs.mkdir(outputDir, { recursive: true });

  const totalFrames = metadata.frame_count;
  const interval = Math.max(1, Math.floor(totalFrames / sampleCount));
  const frameNumbers: number[] = [];

  for (let i = 0; i < sampleCount && i * interval < totalFrames; i++) {
    frameNumbers.push(i * interval);
  }

  // Extract frames using ffmpeg select filter
  const selectExpr = frameNumbers.map((n) => `eq(n\\,${n})`).join('+');

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .outputOptions([
        `-vf`, `select='${selectExpr}',setpts=N/TB`,
        `-vsync`, `vfr`,
        `-frame_pts`, `1`,
      ])
      .output(path.join(outputDir, 'frame_%04d.png'))
      .on('end', async () => {
        // Read actual extracted files
        const files = await fs.readdir(outputDir);
        const framePaths = files
          .filter((f) => f.startsWith('frame_') && f.endsWith('.png'))
          .sort()
          .map((f) => path.join(outputDir, f));

        resolve({ paths: framePaths, frameNumbers: frameNumbers.slice(0, framePaths.length) });
      })
      .on('error', (err) => {
        reject(new Error(`Frame extraction failed: ${err.message}`));
      })
      .run();
  });
}
