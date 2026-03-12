import { FrameMotionVectors, FrameMotion, MotionProfile, VideoMetadata } from '../types';

const HOLD_THRESHOLD = 0.8; // blocks below this average magnitude = hold frame
const MOTION_BLOCK_THRESHOLD = 1.0; // a block is "moving" if magnitude > this

/**
 * Build a motion profile from motion vectors across all frame pairs.
 */
export function buildMotionProfile(
  motionVectors: FrameMotionVectors[],
  _metadata: VideoMetadata
): MotionProfile {
  if (motionVectors.length === 0) {
    return {
      perFrame: [],
      totalMotionFrames: 0,
      holdFrames: 0,
      primaryRegion: null,
      averageDisplacement: 0,
      maxDisplacementFrame: 0,
      dominantDirection: 'mixed',
      motionPath: [],
    };
  }

  const perFrame: FrameMotion[] = [];
  let prevDisplacement = 0;

  // Accumulators for primary region detection
  const blockMotionAccum: number[] = new Array(
    motionVectors[0].gridCols * motionVectors[0].gridRows
  ).fill(0);

  for (const fmv of motionVectors) {
    const movingBlocks = fmv.vectors.filter((v) => v.magnitude > MOTION_BLOCK_THRESHOLD);

    // Average displacement across all blocks (not just moving ones) for honest measurement
    const avgMag =
      fmv.vectors.reduce((s, v) => s + v.magnitude, 0) / fmv.vectors.length;

    // Dominant direction from moving blocks
    let sumDx = 0;
    let sumDy = 0;
    for (const v of movingBlocks.length > 0 ? movingBlocks : fmv.vectors) {
      sumDx += v.dx;
      sumDy += v.dy;
    }
    const dirRad = Math.atan2(sumDy, sumDx);
    const dirDeg = ((dirRad * 180) / Math.PI + 360) % 360;

    // Motion center (weighted by magnitude)
    let totalWeight = 0;
    let wcx = 0;
    let wcy = 0;
    for (const v of fmv.vectors) {
      const cx = (v.bx + 0.5) / fmv.gridCols;
      const cy = (v.by + 0.5) / fmv.gridRows;
      wcx += cx * v.magnitude;
      wcy += cy * v.magnitude;
      totalWeight += v.magnitude;
    }
    if (totalWeight > 0) {
      wcx /= totalWeight;
      wcy /= totalWeight;
    } else {
      wcx = 0.5;
      wcy = 0.5;
    }

    // Bounding box of moving blocks
    let bboxMinX = Infinity, bboxMinY = Infinity;
    let bboxMaxX = -Infinity, bboxMaxY = -Infinity;
    for (const v of movingBlocks) {
      const px = v.bx * fmv.blockSize;
      const py = v.by * fmv.blockSize;
      bboxMinX = Math.min(bboxMinX, px);
      bboxMinY = Math.min(bboxMinY, py);
      bboxMaxX = Math.max(bboxMaxX, px + fmv.blockSize);
      bboxMaxY = Math.max(bboxMaxY, py + fmv.blockSize);
    }
    const hasBBox = movingBlocks.length > 0;
    const bbox = hasBBox
      ? { x: bboxMinX, y: bboxMinY, w: bboxMaxX - bboxMinX, h: bboxMaxY - bboxMinY }
      : null;
    const motionArea = bbox ? bbox.w * bbox.h : 0;

    const acceleration = avgMag - prevDisplacement;
    prevDisplacement = avgMag;

    const isHold = avgMag < HOLD_THRESHOLD;

    perFrame.push({
      frame: fmv.frameB,
      displacement: Math.round(avgMag * 1000) / 1000,
      directionDeg: Math.round(dirDeg * 10) / 10,
      acceleration: Math.round(acceleration * 1000) / 1000,
      motionCenterX: Math.round(wcx * 1000) / 1000,
      motionCenterY: Math.round(wcy * 1000) / 1000,
      motionArea,
      motionBBox: bbox,
      isHold,
    });

    // Accumulate block motion for primary region
    for (let i = 0; i < fmv.vectors.length; i++) {
      blockMotionAccum[i] += fmv.vectors[i].magnitude;
    }
  }

  // Compute primary region from accumulated block motion
  const gridCols = motionVectors[0].gridCols;
  const gridRows = motionVectors[0].gridRows;
  const blockSize = motionVectors[0].blockSize;
  const avgBlockMotion =
    blockMotionAccum.reduce((a, b) => a + b, 0) / blockMotionAccum.length;

  let prMinX = Infinity, prMinY = Infinity;
  let prMaxX = -Infinity, prMaxY = -Infinity;
  let hotBlocks = 0;
  for (let i = 0; i < blockMotionAccum.length; i++) {
    if (blockMotionAccum[i] > avgBlockMotion * 1.5) {
      const bx = i % gridCols;
      const by = Math.floor(i / gridCols);
      prMinX = Math.min(prMinX, bx * blockSize);
      prMinY = Math.min(prMinY, by * blockSize);
      prMaxX = Math.max(prMaxX, (bx + 1) * blockSize);
      prMaxY = Math.max(prMaxY, (by + 1) * blockSize);
      hotBlocks++;
    }
  }
  const primaryRegion =
    hotBlocks > 0
      ? { x: prMinX, y: prMinY, w: prMaxX - prMinX, h: prMaxY - prMinY }
      : null;

  // Aggregate stats
  const totalMotionFrames = perFrame.filter((f) => !f.isHold).length;
  const holdFrames = perFrame.filter((f) => f.isHold).length;
  const avgDisplacement =
    perFrame.length > 0
      ? perFrame.reduce((s, f) => s + f.displacement, 0) / perFrame.length
      : 0;
  const maxFrame = perFrame.reduce(
    (best, f) => (f.displacement > best.displacement ? f : best),
    perFrame[0]
  );

  // Dominant direction
  let totalHoriz = 0;
  let totalVert = 0;
  for (const fmv of motionVectors) {
    for (const v of fmv.vectors) {
      totalHoriz += Math.abs(v.dx);
      totalVert += Math.abs(v.dy);
    }
  }
  const dirRatio = totalHoriz + totalVert > 0 ? totalHoriz / (totalHoriz + totalVert) : 0.5;
  const dominantDirection: 'horizontal' | 'vertical' | 'mixed' =
    dirRatio > 0.65 ? 'horizontal' : dirRatio < 0.35 ? 'vertical' : 'mixed';

  // Motion path
  const motionPath = perFrame
    .filter((f) => !f.isHold)
    .map((f) => ({
      frame: f.frame,
      x: f.motionCenterX,
      y: f.motionCenterY,
    }));

  return {
    perFrame,
    totalMotionFrames,
    holdFrames,
    primaryRegion,
    averageDisplacement: Math.round(avgDisplacement * 1000) / 1000,
    maxDisplacementFrame: maxFrame?.frame ?? 0,
    dominantDirection,
    motionPath,
  };
}
