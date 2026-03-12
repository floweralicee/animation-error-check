import {
  AnalysisOutput,
  AnalysisResult,
  VideoMetadata,
  ExerciseType,
  Issue,
  MotionProfile,
  PrincipleAnalysis,
} from '../types';
import { ZoneMotionProfile } from '../analysis/bodyZones';

interface FormatterInput {
  clipId: string;
  exerciseType: ExerciseType;
  metadata: VideoMetadata;
  motionProfile: MotionProfile;
  zoneProfiles?: ZoneMotionProfile[];
  principlesAnalysis: PrincipleAnalysis[];
  overallScore: number;
  topPriorities: string[];
  analysis: AnalysisResult;
  legacyCritique: {
    issues: Issue[];
    summary: string;
    confidenceNotes: string[];
  };
  principleSummary: string;
  keyframePaths: string[];
}

export function formatOutput(input: FormatterInput): AnalysisOutput {
  return {
    clip_id: input.clipId,
    exercise_type: input.exerciseType,
    metadata: input.metadata,
    motion_profile: {
      total_motion_frames: input.motionProfile.totalMotionFrames,
      hold_frames: input.motionProfile.holdFrames,
      primary_motion_region: input.motionProfile.primaryRegion,
      average_displacement_per_frame: input.motionProfile.averageDisplacement,
      max_displacement_frame: input.motionProfile.maxDisplacementFrame,
      motion_direction_dominant: input.motionProfile.dominantDirection,
    },
    principles_analysis: input.principlesAnalysis,
    overall_score: input.overallScore,
    top_priorities: input.topPriorities,
    zone_profiles: input.zoneProfiles?.map((z) => ({
      zone: z.zone,
      display_name: z.displayName,
      average_displacement: z.averageDisplacement,
      max_displacement: z.maxDisplacement,
      motion_frame_count: z.motionFrameCount,
      hold_frame_count: z.holdFrameCount,
    })),
    analysis: {
      sampled_frames: input.analysis.sampled_frames,
      largest_change_frames: input.analysis.largest_change_frames,
      average_brightness_range: input.analysis.average_brightness_range,
    },
    summary: input.principleSummary,
    issues: input.legacyCritique.issues,
    confidence_notes: input.legacyCritique.confidenceNotes,
    keyframe_paths: input.keyframePaths.length > 0 ? input.keyframePaths : undefined,
  };
}
