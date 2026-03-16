/**
 * Performance benchmark for the animation analysis pipeline.
 *
 * Generates a synthetic 3-second 30fps video using ffmpeg, runs the full
 * analysis pipeline, reports per-step timing, and asserts completion < 30s.
 *
 * Usage: npm run perf-test
 */

import { execSync, spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// Resolve ffmpeg binary from ffmpeg-static
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ffmpegPath: string = require('ffmpeg-static');

async function generateSyntheticVideo(outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Generate a 3-second 30fps video: animated gradient bars to simulate motion
    const args = [
      '-y',
      '-f', 'lavfi',
      '-i', 'testsrc=duration=3:size=640x480:rate=30',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-pix_fmt', 'yuv420p',
      outputPath,
    ];

    const proc = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-300)}`));
    });
  });
}

function mark(label: string, start: number): void {
  const elapsed = ((Date.now() - start) / 1000).toFixed(2);
  console.log(`  [${elapsed.padStart(6)}s]  ${label}`);
}

async function main() {
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'anim-perf-'));
  const videoPath = path.join(workDir, 'test.mp4');

  console.log('\n=== Animation Pipeline Performance Test ===\n');

  const totalStart = Date.now();

  // Generate synthetic video
  process.stdout.write('  Generating synthetic 3s/30fps video...');
  const genStart = Date.now();
  await generateSyntheticVideo(videoPath);
  const genMs = Date.now() - genStart;
  console.log(` done (${(genMs / 1000).toFixed(2)}s)`);

  // Patch console.log to capture pipeline step timing
  const pipelineStart = Date.now();
  const originalLog = console.log;
  const steps: { label: string; t: number }[] = [];
  console.log = (...args: unknown[]) => {
    const msg = args.join(' ');
    steps.push({ label: msg, t: Date.now() - pipelineStart });
    originalLog(`  [${((Date.now() - pipelineStart) / 1000).toFixed(2).padStart(6)}s]  ${msg}`);
  };

  let result: unknown;
  let pipelineError: unknown;

  try {
    // Dynamically import pipeline to pick up compiled TypeScript via tsx
    const { runAnalysisPipeline } = await import('../lib/analysis/index.js');

    console.log('Pipeline start');

    result = await runAnalysisPipeline({
      videoPath,
      clipId: 'perf-test',
      exerciseType: 'auto' as const,
      workDir,
      sampleCount: 48,
    });

    console.log('Pipeline complete');
  } catch (err) {
    pipelineError = err;
  } finally {
    console.log = originalLog;
  }

  const totalMs = Date.now() - totalStart;
  const pipelineMs = Date.now() - pipelineStart;

  // Cleanup
  await fs.rm(workDir, { recursive: true, force: true });

  console.log('\n--- Results ---');

  if (pipelineError) {
    console.error('Pipeline FAILED:', pipelineError);
    process.exit(1);
  }

  const r = result as { analysis?: { sampled_frames?: number }; motionProfile?: { frameCount?: number } };
  const frames = r?.analysis?.sampled_frames ?? '?';
  console.log(`  Sampled frames    : ${frames}`);
  console.log(`  Pipeline time     : ${(pipelineMs / 1000).toFixed(2)}s`);
  console.log(`  Total (incl. gen) : ${(totalMs / 1000).toFixed(2)}s`);

  const THRESHOLD_S = 30;
  if (pipelineMs / 1000 < THRESHOLD_S) {
    console.log(`\n✓ PASS — pipeline completed in ${(pipelineMs / 1000).toFixed(2)}s (< ${THRESHOLD_S}s)\n`);
    process.exit(0);
  } else {
    console.error(`\n✗ FAIL — pipeline took ${(pipelineMs / 1000).toFixed(2)}s (> ${THRESHOLD_S}s)\n`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
