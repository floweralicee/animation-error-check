# System Architecture

## Overview

Animation Error Check is a Next.js web application that analyzes animation video clips using frame-level pixel analysis. It provides automated feedback on motion patterns, brightness, and visual anomalies.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (Client)                      │
│  ┌──────────┐  ┌────────────┐  ┌───────────────────┐   │
│  │UploadForm│→ │ ResultsView│  │ KeyframePreview   │   │
│  │          │  │            │  │ JsonOutput        │   │
│  └──────────┘  └────────────┘  └───────────────────┘   │
└──────────────────────┬──────────────────────────────────┘
                       │ POST /api/analyze (multipart)
                       ▼
┌─────────────────────────────────────────────────────────┐
│                  Next.js API Route                       │
│  ┌──────────────────────────────────────────────────┐   │
│  │ app/api/analyze/route.ts                          │   │
│  │ - Receives file upload                            │   │
│  │ - Saves to temp_uploads/{uuid}/                   │   │
│  │ - Calls analysis pipeline                         │   │
│  │ - Returns JSON + base64 keyframe previews         │   │
│  │ - Cleans up temp files after 60s                  │   │
│  └──────────────────────┬───────────────────────────┘   │
└─────────────────────────┼───────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────┐
│              Analysis Pipeline (lib/)                    │
│                                                          │
│  ┌────────────────┐  ┌────────────────────────────┐     │
│  │ Video Layer    │  │ Analysis Layer              │     │
│  │ (FFmpeg)       │  │ (Sharp)                     │     │
│  │                │  │                              │     │
│  │ • metadata.ts  │  │ • frameDiff.ts              │     │
│  │ • frameSampler │  │ • brightness.ts             │     │
│  │ • keyframes.ts │  │ • critique.ts (heuristics)  │     │
│  └────────┬───────┘  └──────────┬─────────────────┘     │
│           │                      │                       │
│           ▼                      ▼                       │
│  ┌────────────────────────────────────────────────┐     │
│  │ Pipeline Orchestrator (analysis/index.ts)       │     │
│  │ metadata → frames → diffs + brightness →        │     │
│  │ critique → format output                        │     │
│  └────────────────────────────────────────────────┘     │
│           │                                              │
│           ▼                                              │
│  ┌────────────────────────────────────────────────┐     │
│  │ Output Formatter (output/formatter.ts)          │     │
│  │ → AnalysisOutput JSON                           │     │
│  └────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────┘
```

## Data Flow

1. **Upload** — User uploads video via browser form
2. **Save** — API route saves file to `temp_uploads/{uuid}/`
3. **Metadata** — FFprobe extracts fps, duration, resolution, frame count
4. **Frame Sampling** — FFmpeg extracts N evenly-spaced frames as PNG
5. **Keyframe Extraction** — FFmpeg extracts I-frames from the codec
6. **Frame Diff Analysis** — Sharp loads frames as grayscale, computes normalized pixel differences
7. **Brightness Analysis** — Sharp computes per-frame mean brightness
8. **Critique** — Heuristic rules flag issues based on measured data
9. **Format** — Results structured as JSON with summary, issues, confidence notes
10. **Response** — JSON returned to client; keyframes included as base64
11. **Cleanup** — Temp files deleted after 60 seconds

## Key Dependencies

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Web framework | Next.js 14 (App Router) | Server + client rendering |
| Video processing | FFmpeg (via fluent-ffmpeg) | Metadata, frame extraction |
| Image analysis | Sharp | Pixel comparison, brightness |
| File handling | Node.js fs | Temp file management |

## Future Modules (Stubbed)

These are planned but NOT yet implemented:

- **MatAnyone2** — Background removal / matte extraction
- **MediaPipe Pose** — Skeleton/joint tracking for motion analysis
- **Lucas-Kanade Optical Flow** — Sub-pixel motion estimation
- **YAML Rules Engine** — Configurable rule evaluation from animation_rules.yaml
- **LLM Critique** — Natural-language feedback via OpenAI/Claude API
- **Motion Path Extraction** — Track object/joint trajectories over time

## Security Notes

- Uploaded files are saved temporarily and auto-deleted
- No authentication (designed as a local development tool)
- File size capped via `MAX_UPLOAD_SIZE` env var
- No external API calls in the current version
