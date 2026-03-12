import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs/promises';

/**
 * Extract I-frames (keyframes) from the video using FFmpeg.
 * These are the frames the codec considers "key" — useful for visual reference.
 */
export async function extractKeyframes(
  videoPath: string,
  outputDir: string,
  maxKeyframes: number = 8
): Promise<string[]> {
  const keyframeDir = path.join(outputDir, 'keyframes');
  await fs.mkdir(keyframeDir, { recursive: true });

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .outputOptions([
        `-vf`, `select='eq(pict_type\\,I)',setpts=N/TB`,
        `-vsync`, `vfr`,
        `-frames:v`, `${maxKeyframes}`,
      ])
      .output(path.join(keyframeDir, 'kf_%03d.png'))
      .on('end', async () => {
        const files = await fs.readdir(keyframeDir);
        const paths = files
          .filter((f) => f.startsWith('kf_') && f.endsWith('.png'))
          .sort()
          .map((f) => path.join(keyframeDir, f));
        resolve(paths);
      })
      .on('error', (err) => {
        reject(new Error(`Keyframe extraction failed: ${err.message}`));
      })
      .run();
  });
}
