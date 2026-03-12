import ffmpeg from 'fluent-ffmpeg';
import { VideoMetadata } from '../types';

export function extractMetadata(videoPath: string): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, data) => {
      if (err) {
        return reject(new Error(`FFprobe failed: ${err.message}`));
      }

      const videoStream = data.streams.find((s) => s.codec_type === 'video');
      if (!videoStream) {
        return reject(new Error('No video stream found in file'));
      }

      const fps = parseFps(videoStream.r_frame_rate || videoStream.avg_frame_rate || '24/1');
      const duration = parseFloat(String(data.format.duration || '0'));
      const width = videoStream.width || 0;
      const height = videoStream.height || 0;
      const frameCount = videoStream.nb_frames
        ? parseInt(String(videoStream.nb_frames), 10)
        : Math.round(fps * duration);

      resolve({
        fps: Math.round(fps * 100) / 100,
        duration_sec: Math.round(duration * 100) / 100,
        width,
        height,
        frame_count: frameCount,
      });
    });
  });
}

function parseFps(fpsStr: string): number {
  if (fpsStr.includes('/')) {
    const [num, den] = fpsStr.split('/').map(Number);
    return den ? num / den : 24;
  }
  return parseFloat(fpsStr) || 24;
}
