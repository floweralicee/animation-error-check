/**
 * Configure fluent-ffmpeg to use static binaries when running on Vercel/serverless.
 * On local dev, system ffmpeg/ffprobe are used if available.
 */
import ffmpeg from 'fluent-ffmpeg';

let configured = false;

export function ensureFfmpegPaths(): void {
  if (configured) return;

  try {
    const ffmpegStatic = require('ffmpeg-static');
    const ffprobeStatic = require('ffprobe-static');
    if (ffmpegStatic && typeof ffmpegStatic === 'string') {
      ffmpeg.setFfmpegPath(ffmpegStatic);
    }
    if (ffprobeStatic?.path) {
      ffmpeg.setFfprobePath(ffprobeStatic.path);
    }
    configured = true;
  } catch {
    // Fall back to system PATH
  }
}
