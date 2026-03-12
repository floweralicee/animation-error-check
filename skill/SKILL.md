# Animation Error Check — OpenClaw Skill

## Description

Analyze animation clips for common visual issues using frame-level pixel analysis. Upload a video and get back structured feedback on motion patterns, brightness anomalies, abrupt transitions, and more.

## When to use

- User asks to "check my animation" or "review this clip"
- User uploads a video file and wants quality feedback
- User wants to detect pops, holds, or uneven motion in animation
- User mentions "animation error check" or "frame analysis"

## How it works

This skill wraps the `animation-error-check` web app's analysis pipeline. It:

1. Extracts video metadata (fps, resolution, duration, frame count)
2. Samples evenly-spaced frames from the clip
3. Computes frame-to-frame pixel differences (grayscale, normalized)
4. Computes per-frame brightness statistics
5. Identifies frames with the strongest visual changes
6. Runs heuristic critique rules to flag potential issues
7. Returns structured JSON output with summary, issues, and confidence notes

## Usage

### Via the web UI

```
1. Navigate to the animation-error-check web app
2. Upload a video file (.mp4, .mov, .webm, etc.)
3. Optionally select an exercise type
4. Click "Analyze"
5. Review results: summary, issues, keyframes, and raw JSON
```

### Via the API

```bash
curl -X POST http://localhost:3000/api/analyze \
  -F "video=@my_animation.mp4" \
  -F "exercise_type=bouncing_ball"
```

## What it measures

- **Frame-to-frame pixel differences** — detects motion, holds, and abrupt changes
- **Brightness statistics** — per-frame mean brightness, overall range and variance
- **Largest change detection** — identifies the N frames with strongest visual transitions
- **Heuristic issues** — low motion, too-even motion, abrupt transitions, brightness shifts

## What it does NOT measure (yet)

- Timing charts or spacing curves
- Arc quality or motion paths
- Squash and stretch
- Weight, follow-through, or overlap
- Pose estimation or joint tracking
- Easing functions

These require pose estimation (MediaPipe), optical flow (Lucas-Kanade), or motion-path extraction — planned for future versions.

## Output schema

See `schemas/output.schema.json` for the full JSON schema.

## Animation rules

See `rules/animation_rules.yaml` for the heuristic rule definitions.

## Confidence

This tool is honest about its limitations. Every output includes `confidence_notes` explaining what was and wasn't measured. It will never claim to evaluate animation principles it cannot actually detect.
