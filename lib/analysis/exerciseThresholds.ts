import { ExerciseType } from '../types';

/**
 * Exercise-specific thresholds grounded in Disney animation theory.
 *
 * Source: dylantarre/animation-principles timing-principle-mastery,
 * arc-mastery, squash-stretch-mastery, follow-through-overlapping,
 * physics-intuition.
 *
 * At 24fps:
 *   1-2 frames = instant (impacts, pops)
 *   4-6 frames = quick (snappy responses)
 *   8-12 frames = standard (natural movement)
 *   16-24 frames = deliberate (weighted, considered)
 *   48+ frames = very slow (massive, dramatic)
 */

export interface ExerciseProfile {
  name: string;

  // Timing thresholds
  /** Ratio above average displacement to flag as "rushed" */
  rushedRatio: number;
  /** Minimum consecutive frames to consider a rushed run */
  rushedMinFrames: number;
  /** Ratio below average displacement to flag as "dragging" */
  draggingRatio: number;
  /** Minimum consecutive frames to consider a dragging run */
  draggingMinFrames: number;

  // Spacing / easing thresholds
  /** Coefficient of variation below this = constant velocity (mechanical) */
  constantVelocityCV: number;
  /** Minimum ease-in ratio: start velocity should be below this × average */
  easeInMaxStartRatio: number;
  /** Minimum ease-out ratio: end velocity should be below this × average */
  easeOutMaxEndRatio: number;

  // Arc thresholds
  /** Curvature below this = too linear */
  arcMinCurvature: number;
  /** Expected arc height as fraction of travel distance */
  arcExpectedHeight: number;
  /** Deviation above this = erratic/jerky */
  arcMaxDeviation: number;

  // Anticipation
  /** How many frames before a big move to check for anticipation */
  anticipationLookback: number;
  /** Displacement ratio above average that counts as a "big move" */
  bigMoveRatio: number;

  // Follow-through / overlapping action
  /** Maximum acceptable stagger range (frames) before flagging simultaneous stops */
  maxSimultaneousStopRange: number;
  /** Expected stagger per hierarchy level (frames) */
  expectedStaggerPerLevel: number;

  // Squash & stretch
  /** Expected deformation percentage for impacts (0.10 = 10%) */
  expectedDeformation: number;

  // Exaggeration
  /** Minimum dynamic range (max/min displacement) */
  minDynamicRange: number;
  /** Minimum peak-to-average ratio */
  minPeakToAvgRatio: number;

  // Weight/gravity
  /** Expected vertical acceleration pattern */
  expectsGravity: boolean;
  /** Expected timing contrast (how much variation in speed is expected) */
  timingContrast: 'low' | 'medium' | 'high';
}

const BOUNCING_BALL: ExerciseProfile = {
  name: 'bouncing_ball',
  // Bouncing ball should have SHARP timing contrasts — fast falls, slow apexes
  rushedRatio: 2.5,        // Higher tolerance — fast falls are expected
  rushedMinFrames: 4,
  draggingRatio: 0.2,      // Very slow = only at apex, should be brief
  draggingMinFrames: 6,

  constantVelocityCV: 0.20, // Needs MORE variation than average (gravity = non-constant)
  easeInMaxStartRatio: 0.5, // Should ease in strongly at apex
  easeOutMaxEndRatio: 0.5,  // Should ease out strongly into apex

  arcMinCurvature: 0.001,   // Arcs should be clearly parabolic
  arcExpectedHeight: 0.35,  // 35% of travel — pronounced arcs
  arcMaxDeviation: 0.025,

  anticipationLookback: 3,
  bigMoveRatio: 2.0,

  maxSimultaneousStopRange: 1,  // Ball is one object — stops are instant
  expectedStaggerPerLevel: 0,

  expectedDeformation: 0.15, // 15% squash on impact — very visible
  minDynamicRange: 3.0,     // Strong contrast between fast/slow
  minPeakToAvgRatio: 2.0,

  expectsGravity: true,
  timingContrast: 'high',
};

const WALK_CYCLE: ExerciseProfile = {
  name: 'walk_cycle',
  // Walk cycle should be rhythmic — consistent cycle length, varied within each step
  rushedRatio: 1.8,
  rushedMinFrames: 3,
  draggingRatio: 0.25,
  draggingMinFrames: 4,

  constantVelocityCV: 0.12, // Some variation expected per step
  easeInMaxStartRatio: 0.7,
  easeOutMaxEndRatio: 0.7,

  arcMinCurvature: 0.0003,  // Subtler arcs — figure-8 hips, pendulum arms
  arcExpectedHeight: 0.15,  // 15% — moderate arcs
  arcMaxDeviation: 0.04,

  anticipationLookback: 4,
  bigMoveRatio: 2.0,

  maxSimultaneousStopRange: 4,  // Body parts should stagger 2-4 frames
  expectedStaggerPerLevel: 3,    // ~3 frames between root → limbs → extremities

  expectedDeformation: 0.05, // 5% — subtle weight shifts
  minDynamicRange: 1.8,
  minPeakToAvgRatio: 1.4,

  expectsGravity: true,
  timingContrast: 'medium',
};

const JUMP: ExerciseProfile = {
  name: 'jump',
  // Jump: strong anticipation, fast ascent, slow apex, fast descent, strong squash on landing
  rushedRatio: 3.0,        // Fast ascent/descent is expected
  rushedMinFrames: 5,
  draggingRatio: 0.15,     // Apex should be slow but brief
  draggingMinFrames: 8,

  constantVelocityCV: 0.25, // Strong variation expected
  easeInMaxStartRatio: 0.3, // Should have strong ease-in (anticipation into jump)
  easeOutMaxEndRatio: 0.4,  // Should ease out at apex

  arcMinCurvature: 0.002,   // Strong parabolic arc
  arcExpectedHeight: 0.45,  // 45% — big arc
  arcMaxDeviation: 0.02,

  anticipationLookback: 6,   // Longer wind-up expected
  bigMoveRatio: 1.8,

  maxSimultaneousStopRange: 6,  // Landing should cascade through body
  expectedStaggerPerLevel: 4,    // Strong overlap on landing

  expectedDeformation: 0.12, // 12% — visible squash on landing
  minDynamicRange: 3.5,     // Very strong contrast
  minPeakToAvgRatio: 2.5,

  expectsGravity: true,
  timingContrast: 'high',
};

const ACTING: ExerciseProfile = {
  name: 'acting',
  // Acting: theatrical, emotional, highly varied
  rushedRatio: 2.0,
  rushedMinFrames: 3,
  draggingRatio: 0.2,
  draggingMinFrames: 5,

  constantVelocityCV: 0.10, // Even subtle acting should have variation
  easeInMaxStartRatio: 0.6,
  easeOutMaxEndRatio: 0.6,

  arcMinCurvature: 0.0003,
  arcExpectedHeight: 0.12,
  arcMaxDeviation: 0.05,

  anticipationLookback: 5,
  bigMoveRatio: 2.2,

  maxSimultaneousStopRange: 5,
  expectedStaggerPerLevel: 3,

  expectedDeformation: 0.03, // 3% — subtle for acting
  minDynamicRange: 2.0,
  minPeakToAvgRatio: 1.6,

  expectsGravity: false,     // Not necessarily — could be seated
  timingContrast: 'medium',
};

const AUTO: ExerciseProfile = {
  name: 'auto',
  // Conservative defaults — middle ground
  rushedRatio: 2.0,
  rushedMinFrames: 3,
  draggingRatio: 0.3,
  draggingMinFrames: 5,

  constantVelocityCV: 0.15,
  easeInMaxStartRatio: 0.75,
  easeOutMaxEndRatio: 0.75,

  arcMinCurvature: 0.0005,
  arcExpectedHeight: 0.15,
  arcMaxDeviation: 0.035,

  anticipationLookback: 4,
  bigMoveRatio: 2.0,

  maxSimultaneousStopRange: 3,
  expectedStaggerPerLevel: 2,

  expectedDeformation: 0.08,
  minDynamicRange: 2.0,
  minPeakToAvgRatio: 1.5,

  expectsGravity: false,
  timingContrast: 'medium',
};

const PROFILES: Record<ExerciseType, ExerciseProfile> = {
  auto: AUTO,
  bouncing_ball: BOUNCING_BALL,
  walk_cycle: WALK_CYCLE,
  jump: JUMP,
  acting: ACTING,
};

export function getExerciseProfile(exerciseType: ExerciseType): ExerciseProfile {
  return PROFILES[exerciseType] || AUTO;
}
