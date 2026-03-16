/**
 * Run analysis on test.mov and write results to a markdown file.
 * Usage: npx tsx scripts/test-to-md.ts
 */

import { runAnalysisPipeline } from '../lib/analysis/index';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

const VIDEO_PATH = path.resolve('temp_uploads/1af813e1-691a-4e5c-92b7-8a77b3c81b1f/test.mov');
const OUTPUT_PATH = path.resolve('temp_uploads/1af813e1-691a-4e5c-92b7-8a77b3c81b1f/test-results.md');

async function main() {
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'anim-test-'));
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

    const md = [
      `# Animation Analysis Report`,
      ``,
      `**Video:** \`${path.basename(VIDEO_PATH)}\``,
      `**Run:** ${new Date().toISOString()}`,
      `**Elapsed:** ${elapsed.toFixed(2)}s`,
      ``,
      `---`,
      ``,
      `## Metrics`,
      ``,
      `| Metric | Value |`,
      `|--------|-------|`,
      `| Sampled frames | ${result.analysis?.sampled_frames ?? '?'} |`,
      `| Overall score | ${result.overall_score != null ? (result.overall_score * 100).toFixed(1) + '%' : '?'} |`,
      `| Exercise type | ${result.exercise_type ?? '?'} |`,
      `| Motion direction | ${result.motion_profile?.motion_direction_dominant ?? '?'} |`,
      `| FPS | ${result.metadata?.fps ?? '?'} |`,
      `| Duration | ${result.metadata?.duration_sec ?? '?'}s |`,
      `| Resolution | ${result.metadata?.width ?? '?'}×${result.metadata?.height ?? '?'} |`,
      ``,
      `## Summary`,
      ``,
      result.summary ?? '_No summary_',
      ``,
      `---`,
      ``,
      `## Top Priorities`,
      ``,
      ...(result.top_priorities?.length
        ? result.top_priorities.map((p, i) => `${i + 1}. ${p}`)
        : ['_None_']),
      ``,
      `---`,
      ``,
      `## 12 Principles`,
      ``,
      ...(result.principles_analysis?.map((p) => {
        const issues = p.issues?.length ?? 0;
        const score = (p.score * 100).toFixed(0);
        return `### ${p.display_name}\n\n**Score:** ${score}% | **Issues:** ${issues}\n\n${p.issues?.slice(0, 10).map((i) => `- [${i.severity}] ${i.description}`).join('\n') || '_No issues_'}\n`;
      }) ?? ['_No data_']),
      ``,
      `---`,
      ``,
      `## Confidence Notes`,
      ``,
      ...(result.confidence_notes?.map((n) => `- ${n}`) ?? ['_None_']),
      ``,
    ].join('\n');

    await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
    await fs.writeFile(OUTPUT_PATH, md, 'utf-8');

    await fs.rm(workDir, { recursive: true, force: true });

    console.log(`\n✓ Report written to ${OUTPUT_PATH}\n`);
    process.exit(0);
  } catch (err) {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
    console.error('Error:', err);
    process.exit(1);
  }
}

main();
