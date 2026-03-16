export type ExerciseType = 'auto' | 'bouncing_ball' | 'walk_cycle' | 'jump' | 'acting';

export interface VideoMetadata {
  fps: number;
  duration_sec: number;
  width: number;
  height: number;
  frame_count: number;
}

export interface FrameDiffResult {
  frameA: number;
  frameB: number;
  diffScore: number; // 0-1, where 0 = identical, 1 = completely different
}

export interface BrightnessStats {
  perFrame: { frame: number; mean: number }[];
  overall: { min: number; max: number; mean: number; stddev: number };
}

export interface AnalysisResult {
  sampled_frames: number;
  frame_diffs: FrameDiffResult[];
  largest_change_frames: number[];
  average_brightness_range: { min: number; max: number };
  brightness_stats: BrightnessStats;
}

export interface Issue {
  category: string;
  severity: 'low' | 'medium' | 'high';
  frame_range: [number, number];
  note: string;
}

// --- Motion vector types ---

export interface MotionVector {
  bx: number;   // block grid x
  by: number;   // block grid y
  dx: number;   // displacement x (pixels)
  dy: number;   // displacement y (pixels)
  magnitude: number;
  sad: number;   // sum of absolute differences (match quality)
}

export interface FrameMotionVectors {
  frameA: number;
  frameB: number;
  vectors: MotionVector[];
  gridCols: number;
  gridRows: number;
  blockSize: number;
}

// --- Motion profile types ---

export interface FrameMotion {
  frame: number;
  displacement: number;    // average magnitude across moving blocks
  directionDeg: number;    // dominant direction in degrees
  acceleration: number;    // change from previous frame's displacement
  motionCenterX: number;   // weighted center of motion X (0-1 normalized)
  motionCenterY: number;   // weighted center of motion Y (0-1 normalized)
  motionArea: number;      // bounding box area of moving region (pixels²)
  motionBBox: { x: number; y: number; w: number; h: number } | null;
  isHold: boolean;
}

export interface MotionProfile {
  perFrame: FrameMotion[];
  totalMotionFrames: number;
  holdFrames: number;
  primaryRegion: { x: number; y: number; w: number; h: number } | null;
  averageDisplacement: number;
  maxDisplacementFrame: number;
  dominantDirection: 'horizontal' | 'vertical' | 'mixed';
  motionPath: { frame: number; x: number; y: number }[];
}

// --- Principle analysis types ---

export interface ToolSuggestion {
  tool: string;
  feature: string;
  description: string;
  url?: string;
  workflow: string;
}

export interface PrincipleIssue {
  severity: 'low' | 'medium' | 'high';
  frame_start: number;
  frame_end: number;
  timestamp_start: string;
  timestamp_end: string;
  description: string;
  recommendation: string;
  measured_data: Record<string, unknown>;
  confidence: number;
  body_zone?: string;           // which body zone this issue applies to
  body_zone_display?: string;   // display name of the zone
  tool_suggestions?: ToolSuggestion[];
}

export interface PrincipleAnalysis {
  principle: string;
  display_name: string;
  score: number; // 0-1
  issues: PrincipleIssue[];
  zone_scores?: Record<string, number>; // per-body-zone scores
}

// --- Output types ---

export interface AnalysisOutput {
  clip_id: string;
  exercise_type: ExerciseType;
  metadata: VideoMetadata;
  motion_profile: {
    total_motion_frames: number;
    hold_frames: number;
    primary_motion_region: { x: number; y: number; w: number; h: number } | null;
    average_displacement_per_frame: number;
    max_displacement_frame: number;
    motion_direction_dominant: string;
  };
  principles_analysis: PrincipleAnalysis[];
  overall_score: number;
  top_priorities: string[];
  zone_profiles?: {
    zone: string;
    display_name: string;
    average_displacement: number;
    max_displacement: number;
    motion_frame_count: number;
    hold_frame_count: number;
  }[];
  // Legacy fields
  analysis: {
    sampled_frames: number;
    largest_change_frames: number[];
    average_brightness_range: { min: number; max: number };
  };
  summary: string;
  issues: Issue[];
  confidence_notes: string[];
  keyframe_paths?: string[];
  /** Per-frame motion data for the motion profile chart */
  motion_profile_detail?: { frame: number; displacement: number; isHold: boolean }[];
}

export interface PipelineInput {
  videoPath: string;
  clipId: string;
  exerciseType: ExerciseType;
  workDir: string;
  sampleCount?: number;
  /** When true, sample all frames (bypasses Vercel/local caps). For testing. */
  useAllFrames?: boolean;
  /** Optional callback invoked at each pipeline step for timeout diagnostics. */
  onStep?: (step: string) => void;
}
