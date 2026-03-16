/**
 * Test the analysis pipeline against a real video file with a 60s threshold.
 * Usage: npx tsx scripts/test-real-video.ts
 */

import { runAnalysisPipeline } from '../lib/analysis/index';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

const VIDEO_PATH = path.resolve('temp_uploads/1af813e1-691a-4e5c-92b7-8a77b3c81b1f/test.mov');
const TIMEOUT_S = 60;

async function main() {
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'anim-test-'));
  console.log('\n=== Animation Analysis Test (60s threshold) ===');
  console.log(`  Video   : ${VIDEO_PATH}`);
  console.log(`  WorkDir : ${workDir}\n`);

  const start = Date.now();

  try {
    const result = await runAnalysisPipeline({
      videoPath: VIDEO_PATH,
      clipId: 'test-run',
      exerciseType: 'auto',
      workDir,
      sampleCount: 48,
      useAllFrames: true,
    });

    const elapsed = (Date.now() - start) / 1000;

    console.log('\n--- Results ---');
    console.log(`  Sampled frames   : ${result.analysis?.sampled_frames ?? '?'}`);
    console.log(`  Overall score    : ${result.overall_score != null ? (result.overall_score * 100).toFixed(1) + '%' : '?'}`);
    console.log(`  Exercise type    : ${result.exercise_type ?? '?'}`);
    console.log(`  Motion direction : ${result.motion_profile?.motion_direction_dominant ?? '?'}`);
    console.log(`  Principles found : ${result.principles_analysis?.length ?? 0}`);
    if (result.top_priorities?.length) {
      console.log(`  Top priorities   :`);
      result.top_priorities.slice(0, 3).forEach((p, i) => console.log(`    ${i + 1}. ${p}`));
    }
    console.log(`  Summary snippet  : ${result.summary?.slice(0, 120) ?? '?'}...`);
    console.log(`  Elapsed time   : ${elapsed.toFixed(2)}s`);

    await fs.rm(workDir, { recursive: true, force: true });

    if (elapsed < TIMEOUT_S) {
      console.log(`\n✓ PASS — completed in ${elapsed.toFixed(2)}s (< ${TIMEOUT_S}s)\n`);
      process.exit(0);
    } else {
      console.error(`\n✗ FAIL — took ${elapsed.toFixed(2)}s (> ${TIMEOUT_S}s)\n`);
      process.exit(1);
    }
  } catch (err) {
    const elapsed = (Date.now() - start) / 1000;
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
    console.error(`\n✗ ERROR after ${elapsed.toFixed(2)}s:`, err);
    process.exit(1);
  }
}

main();
