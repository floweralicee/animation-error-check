import { FrameMotionVectors, MotionVector } from '../types';

/**
 * Body zone definitions — divide the primary motion bounding box into anatomical zones.
 * These are approximate regions based on standard character proportions.
 * Future versions will use MediaPipe pose landmarks for precise segmentation.
 */

export type BodyZone =
  | 'head'
  | 'chest'
  | 'left_arm'
  | 'right_arm'
  | 'core'
  | 'left_leg'
  | 'right_leg'
  | 'whole_body';

export interface ZoneRect {
  /** Normalized 0-1 relative to primary motion region */
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Standard character zone layout (normalized to bounding box).
 * Based on ~8-head proportion figure:
 *   Head: top 12%
 *   Chest/Shoulders: 12-28%
 *   Left/Right arms: sides of 12-50%
 *   Core: center 28-50%
 *   Left/Right legs: bottom 50-100%
 */
export const ZONE_DEFINITIONS: Record<Exclude<BodyZone, 'whole_body'>, ZoneRect> = {
  head:      { x: 0.25, y: 0.0,  w: 0.50, h: 0.12 },
  chest:     { x: 0.20, y: 0.12, w: 0.60, h: 0.16 },
  left_arm:  { x: 0.0,  y: 0.12, w: 0.22, h: 0.38 },
  right_arm: { x: 0.78, y: 0.12, w: 0.22, h: 0.38 },
  core:      { x: 0.22, y: 0.28, w: 0.56, h: 0.22 },
  left_leg:  { x: 0.10, y: 0.50, w: 0.35, h: 0.50 },
  right_leg: { x: 0.55, y: 0.50, w: 0.35, h: 0.50 },
};

export const ZONE_DISPLAY_NAMES: Record<BodyZone, string> = {
  head: 'Head / Nose',
  chest: 'Chest / Shoulders',
  left_arm: 'Left Arm',
  right_arm: 'Right Arm',
  core: 'Core / Hips',
  left_leg: 'Left Leg',
  right_leg: 'Right Leg',
  whole_body: 'Whole Body',
};

export interface ZoneMotionFrame {
  frame: number;
  displacement: number;
  directionDeg: number;
  acceleration: number;
  blockCount: number;      // how many motion blocks fell in this zone
  isHold: boolean;
}

export interface ZoneMotionProfile {
  zone: BodyZone;
  displayName: string;
  perFrame: ZoneMotionFrame[];
  averageDisplacement: number;
  maxDisplacement: number;
  maxDisplacementFrame: number;
  holdFrameCount: number;
  motionFrameCount: number;
  /** Motion path within this zone (center of moving blocks) */
  motionPath: { frame: number; x: number; y: number }[];
}

const HOLD_THRESHOLD = 0.6;

/**
 * Extract per-zone motion profiles from motion vectors.
 *
 * @param motionVectors - Per-frame-pair motion vectors
 * @param primaryRegion - The detected primary motion bounding box (in analysis-resolution pixels)
 */
export function extractZoneMotionProfiles(
  motionVectors: FrameMotionVectors[],
  primaryRegion: { x: number; y: number; w: number; h: number } | null
): ZoneMotionProfile[] {
  if (!primaryRegion || motionVectors.length === 0) {
    return [];
  }

  const zones: Exclude<BodyZone, 'whole_body'>[] = [
    'head', 'chest', 'left_arm', 'right_arm', 'core', 'left_leg', 'right_leg',
  ];

  const results: ZoneMotionProfile[] = [];

  for (const zone of zones) {
    const zoneDef = ZONE_DEFINITIONS[zone];

    // Convert normalized zone rect to absolute pixel coords within the analysis grid
    const zoneAbsX = primaryRegion.x + zoneDef.x * primaryRegion.w;
    const zoneAbsY = primaryRegion.y + zoneDef.y * primaryRegion.h;
    const zoneAbsW = zoneDef.w * primaryRegion.w;
    const zoneAbsH = zoneDef.h * primaryRegion.h;

    const perFrame: ZoneMotionFrame[] = [];
    const motionPath: { frame: number; x: number; y: number }[] = [];
    let prevDisp = 0;

    for (const fmv of motionVectors) {
      // Find blocks that fall within this zone
      const zoneBlocks = fmv.vectors.filter((v) => {
        const blockCenterX = (v.bx + 0.5) * fmv.blockSize;
        const blockCenterY = (v.by + 0.5) * fmv.blockSize;
        return (
          blockCenterX >= zoneAbsX &&
          blockCenterX < zoneAbsX + zoneAbsW &&
          blockCenterY >= zoneAbsY &&
          blockCenterY < zoneAbsY + zoneAbsH
        );
      });

      if (zoneBlocks.length === 0) {
        perFrame.push({
          frame: fmv.frameB,
          displacement: 0,
          directionDeg: 0,
          acceleration: -prevDisp,
          blockCount: 0,
          isHold: true,
        });
        prevDisp = 0;
        continue;
      }

      const avgMag = zoneBlocks.reduce((s, v) => s + v.magnitude, 0) / zoneBlocks.length;

      // Dominant direction
      let sumDx = 0, sumDy = 0;
      for (const v of zoneBlocks) {
        sumDx += v.dx;
        sumDy += v.dy;
      }
      const dirRad = Math.atan2(sumDy, sumDx);
      const dirDeg = ((dirRad * 180) / Math.PI + 360) % 360;

      const acceleration = avgMag - prevDisp;
      prevDisp = avgMag;

      const isHold = avgMag < HOLD_THRESHOLD;

      perFrame.push({
        frame: fmv.frameB,
        displacement: Math.round(avgMag * 1000) / 1000,
        directionDeg: Math.round(dirDeg * 10) / 10,
        acceleration: Math.round(acceleration * 1000) / 1000,
        blockCount: zoneBlocks.length,
        isHold,
      });

      if (!isHold) {
        // Weighted center within zone
        let totalW = 0, wcx = 0, wcy = 0;
        for (const v of zoneBlocks) {
          const cx = (v.bx + 0.5) * fmv.blockSize;
          const cy = (v.by + 0.5) * fmv.blockSize;
          wcx += cx * v.magnitude;
          wcy += cy * v.magnitude;
          totalW += v.magnitude;
        }
        if (totalW > 0) {
          // Normalize to 0-1 within zone
          motionPath.push({
            frame: fmv.frameB,
            x: Math.round(((wcx / totalW - zoneAbsX) / zoneAbsW) * 1000) / 1000,
            y: Math.round(((wcy / totalW - zoneAbsY) / zoneAbsH) * 1000) / 1000,
          });
        }
      }
    }

    const nonHold = perFrame.filter((f) => !f.isHold);
    const avgDisp = nonHold.length > 0
      ? nonHold.reduce((s, f) => s + f.displacement, 0) / nonHold.length
      : 0;
    const maxFrame = perFrame.reduce(
      (best, f) => (f.displacement > best.displacement ? f : best),
      perFrame[0] || { displacement: 0, frame: 0 }
    );

    results.push({
      zone,
      displayName: ZONE_DISPLAY_NAMES[zone],
      perFrame,
      averageDisplacement: Math.round(avgDisp * 1000) / 1000,
      maxDisplacement: Math.round(maxFrame.displacement * 1000) / 1000,
      maxDisplacementFrame: maxFrame.frame,
      holdFrameCount: perFrame.filter((f) => f.isHold).length,
      motionFrameCount: nonHold.length,
      motionPath,
    });
  }

  return results;
}
