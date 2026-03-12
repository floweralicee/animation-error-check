# Animation Error Check

A web-based tool for automated visual analysis of animation clips. Upload a video, get structured feedback on motion patterns, brightness anomalies, and visual issues.

**This is an early-stage experiment.** It does real pixel-level analysis but does not (yet) understand animation principles like timing, spacing, arcs, or weight.

## What it does

- **Extracts video metadata** — fps, duration, resolution, frame count via FFmpeg
- **Samples frames** — extracts evenly-spaced frames from the video
- **Computes frame differences** — pixel-level comparison between consecutive sampled frames (grayscale, normalized to 320×240)
- **Computes brightness stats** — per-frame mean brightness, overall range and variance
- **Detects strongest changes** — identifies the frames with the largest visual transitions
- **Runs heuristic critique** — flags issues like: very low motion, too-even motion, abrupt transitions, brightness shifts, possible holds
- **Extracts I-frame keyframes** — codec-level keyframes for visual reference
- **Returns structured JSON** — everything in a clean, schema-documented format

## What it does NOT do (yet)

Be honest about this:

- ❌ **No timing/spacing analysis** — can't evaluate ease-in/ease-out, acceleration curves
- ❌ **No arc detection** — doesn't track motion paths
- ❌ **No squash & stretch** — can't detect shape deformation
- ❌ **No pose estimation** — no skeleton/joint tracking (MediaPipe planned)
- ❌ **No optical flow** — no sub-pixel motion estimation (Lucas-Kanade planned)
- ❌ **No LLM critique** — no natural-language feedback from AI models (planned)
- ❌ **No background removal** — MatAnyone2 integration planned
- ❌ **No exercise-specific rules** — exercise type is accepted but not yet used for specialized analysis

The tool is honest about its limitations. Every output includes `confidence_notes` explaining what was and wasn't measured.

## How to run locally

### Prerequisites

- **Node.js** 18+
- **FFmpeg** installed and in your PATH
  - macOS: `brew install ffmpeg`
  - Ubuntu: `sudo apt install ffmpeg`
  - Windows: download from [ffmpeg.org](https://ffmpeg.org/download.html)

### Setup

```bash
git clone https://github.com/floweralicee/animation-error-check.git
cd animation-error-check
npm install
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables (optional)

Copy `.env.example` to `.env.local` and adjust:

```bash
cp .env.example .env.local
```

| Variable | Default | Description |
|----------|---------|-------------|
| `MAX_UPLOAD_SIZE` | `104857600` (100MB) | Max upload size in bytes |
| `SAMPLE_FRAME_COUNT` | `24` | Number of frames to sample |
| `UPLOAD_DIR` | `./temp_uploads` | Temp directory for uploads |

## API

### POST `/api/analyze`

Multipart form data:
- `video` (file, required) — the video to analyze
- `exercise_type` (string, optional) — one of: `auto`, `bouncing_ball`, `walk_cycle`, `jump`, `acting`

Returns JSON matching the schema in `skill/schemas/output.schema.json`.

### Example

```bash
curl -X POST http://localhost:3000/api/analyze \
  -F "video=@my_clip.mp4" \
  -F "exercise_type=bouncing_ball"
```

## Architecture

```
animation-error-check/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Upload UI
│   └── api/analyze/       # Analysis endpoint
├── components/            # React components
├── lib/
│   ├── video/             # FFmpeg operations
│   ├── analysis/          # Frame diff, brightness, critique
│   └── output/            # JSON formatter
├── skill/                 # OpenClaw skill definition
└── temp_uploads/          # Gitignored temp storage
```

See `skill/docs/system_architecture.md` for detailed architecture docs.

## OpenClaw Skill

The `skill/` directory contains an OpenClaw skill definition that wraps this tool. It includes:

- Skill manifest and trigger definitions
- Animation critique rules (YAML)
- JSON schemas for metrics and output
- Prompt template for future LLM integration
- Example output
- Architecture documentation

To use: symlink or copy `skill/` into your OpenClaw skills directory.

## Future Roadmap

Roughly in priority order:

1. **Exercise-specific analysis** — use exercise type to apply tailored rules
2. **MediaPipe Pose integration** — skeleton tracking for motion-path and timing analysis
3. **Lucas-Kanade optical flow** — sub-pixel motion estimation
4. **LLM critique layer** — natural-language feedback using the prompt template
5. **MatAnyone2 integration** — background removal for cleaner character analysis
6. **YAML rules engine** — load and evaluate rules from `animation_rules.yaml` dynamically
7. **Motion path visualization** — overlay motion trails on keyframes
8. **Batch analysis** — process multiple clips at once
9. **Comparison mode** — side-by-side analysis of two versions

## Tech Stack

- **Next.js 14** (App Router) — web framework
- **TypeScript** — type safety
- **Sharp** — image processing (pixel comparison, brightness)
- **fluent-ffmpeg** — video metadata and frame extraction
- **FFmpeg** — system dependency for video processing

## License

MIT
