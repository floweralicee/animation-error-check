/**
 * Animation tool suggestions mapped to detected issues.
 * AnimBot tool names are EXACT from https://animbot.ca/tooltips/en/
 */

export interface ToolSuggestion {
  tool: string;
  feature: string;
  description: string;
  url?: string;
  workflow: string;
}

type IssueCategory =
  | 'rushed_timing'
  | 'slow_timing'
  | 'no_ease_in'
  | 'no_ease_out'
  | 'constant_velocity'
  | 'linear_arc'
  | 'erratic_arc'
  | 'no_anticipation'
  | 'abrupt_stop'
  | 'no_squash_stretch'
  | 'poor_staging'
  | 'no_secondary_action'
  | 'under_exaggerated'
  | 'proportion_change'
  | 'low_contrast'
  | 'mechanical_interpolation'
  | 'general';

const TOOL_MAP: Record<IssueCategory, ToolSuggestion[]> = {
  rushed_timing: [
    {
      tool: 'animBot',
      feature: 'Insert Remove Inbetween',
      description: 'Insert empty frames between keys to slow down rushed sections without changing poses.',
      url: 'https://animbot.ca',
      workflow: '1. Select the affected controllers. 2. Go to the rushed frame range. 3. Use "Insert Remove Inbetween" to add 1–2 empty frames between keys. 4. This spreads the timing out without changing your poses.',
    },
    {
      tool: 'animBot',
      feature: 'Tweener',
      description: 'Create precise in-between keys to add spacing detail in rushed areas.',
      url: 'https://animbot.ca',
      workflow: '1. Select controls for the rushed frames. 2. Go to the midpoint of the rushed range. 3. Use "Tweener" slider — bias toward the start pose (30–40%) to create a slow-in effect. 4. Add 2–3 breakdowns this way to distribute the motion more evenly.',
    },
    {
      tool: 'animBot',
      feature: 'Nudge Left Right',
      description: 'Nudge keys apart to spread timing in rushed sections.',
      url: 'https://animbot.ca',
      workflow: '1. Select keys at the end of the rushed section. 2. Use "Nudge Left Right" to push them later by 2–4 frames. 3. This creates more time for the action to read.',
    },
  ],

  slow_timing: [
    {
      tool: 'animBot',
      feature: 'Nudge Left Right',
      description: 'Nudge keys closer together to compress slow sections.',
      url: 'https://animbot.ca',
      workflow: '1. Select keys at the end of the slow section. 2. Use "Nudge Left Right" to pull them earlier by 2–4 frames. 3. Review the result — the motion should feel snappier.',
    },
    {
      tool: 'animBot',
      feature: 'Insert Remove Inbetween',
      description: 'Remove empty frames between keys to tighten dragging sections.',
      url: 'https://animbot.ca',
      workflow: '1. Select keys in the slow section. 2. Use "Insert Remove Inbetween" with a negative value to remove frames. 3. This compresses the timing without changing poses.',
    },
    {
      tool: 'animBot',
      feature: 'Simplify Bake Keys',
      description: 'Simplify the curve to remove redundant keys in slow areas.',
      url: 'https://animbot.ca',
      workflow: '1. Select keys in the dragging section. 2. Use "Simplify Bake Keys" slider toward Simplify — it removes keys while maintaining curve shape. 3. Fewer keys in the same time = tighter motion.',
    },
  ],

  no_ease_in: [
    {
      tool: 'animBot',
      feature: 'Ease In Out',
      description: 'Recalculate keys into a perfect ease-in curve.',
      url: 'https://animbot.ca',
      workflow: '1. Select the keys at the start of the motion. 2. Use "Ease In Out" slider — this recalculates key values into a mathematically perfect ease. 3. Note: this replaces your current values. For a gentler approach, use "Blend to Ease" instead.',
    },
    {
      tool: 'animBot',
      feature: 'Blend to Ease',
      description: 'Gradually blend your current spacing toward an ease-in curve.',
      url: 'https://animbot.ca',
      workflow: '1. Select the start keys. 2. Use "Blend to Ease" slider — this gradually blends your current pose toward a perfect ease, preserving your existing work. 3. Dial in just enough to soften the harsh start.',
    },
    {
      tool: 'animBot',
      feature: 'Polished Tangent',
      description: 'Apply smooth, controlled tangents at motion start.',
      url: 'https://animbot.ca',
      workflow: '1. Select keys at the motion start. 2. Apply "Polished Tangent" — this calculates the best smooth transitions between keys, keeping overshoots minimal. 3. The motion will start gently instead of jumping to full speed.',
    },
  ],

  no_ease_out: [
    {
      tool: 'animBot',
      feature: 'Blend to Ease',
      description: 'Gradually blend the end of motion toward an ease-out curve.',
      url: 'https://animbot.ca',
      workflow: '1. Select the end keys of the motion segment. 2. Use "Blend to Ease" slider to gradually soften the deceleration. 3. This preserves your pose while adding the missing ease-out.',
    },
    {
      tool: 'animBot',
      feature: 'Scale from Neighbor Right',
      description: 'Scale keys toward the final pose to create deceleration.',
      url: 'https://animbot.ca',
      workflow: '1. Select the keys approaching the stop. 2. Use "Scale from Neighbor Right" to scale values down toward the end pose. 3. This creates natural deceleration — the spacing gets tighter as it approaches the hold.',
    },
    {
      tool: 'animBot',
      feature: 'Polished Tangent',
      description: 'Apply smooth tangents at motion end to prevent abrupt stops.',
      url: 'https://animbot.ca',
      workflow: '1. Select the last 3–4 keys before the stop. 2. Apply "Polished Tangent" — it calculates smooth transitions that naturally ease into the hold.',
    },
  ],

  constant_velocity: [
    {
      tool: 'animBot',
      feature: 'Tweener',
      description: 'Break constant velocity by creating biased in-between keys.',
      url: 'https://animbot.ca',
      workflow: '1. Select the evenly-spaced section. 2. Go to 1/3 point and use "Tweener" at 30% bias (favoring the start pose). 3. Go to 2/3 point and use "Tweener" at 70% bias (favoring the end pose). 4. This creates an S-curve in the spacing — no more linear motion.',
    },
    {
      tool: 'animBot',
      feature: 'Blend to Ease',
      description: 'Gradually convert linear spacing to eased spacing.',
      url: 'https://animbot.ca',
      workflow: '1. Select all keys in the constant-velocity section. 2. Use "Blend to Ease" slider to gradually add easing. 3. This is the fastest way to break mechanical even spacing.',
    },
    {
      tool: 'animBot',
      feature: 'Smooth Rough',
      description: 'Smooth the curve to reduce the mechanical feel.',
      url: 'https://animbot.ca',
      workflow: '1. Select keys in the flat section. 2. Use "Smooth Rough" slider toward Smooth. 3. This softens the curve transitions. TIP: Apply multiple times with small amounts for best results.',
    },
  ],

  linear_arc: [
    {
      tool: 'animBot',
      feature: 'Motion Trail',
      description: 'Visualize the arc path to see the straight-line problem clearly.',
      url: 'https://animbot.ca',
      workflow: '1. Select the control with the linear path (wrist, head, foot). 2. Enable "Motion Trail" — you\'ll see the straight-line path drawn in the viewport. 3. Now add a breakdown in the middle and offset it perpendicular to the line. 4. Check Motion Trail again — it should curve.',
    },
    {
      tool: 'animBot',
      feature: 'Tweener World Space',
      description: 'Create world-space in-betweens to fix arcs that cross hierarchies.',
      url: 'https://animbot.ca',
      workflow: '1. Select the control. 2. Go to the midpoint of the linear section. 3. Use "Tweener World Space" to create a breakdown that respects global position. 4. Manually offset the breakdown to create the arc curve.',
    },
  ],

  erratic_arc: [
    {
      tool: 'animBot',
      feature: 'Smooth Rough',
      description: 'Smooth the jerky animation curve to clean up the arc.',
      url: 'https://animbot.ca',
      workflow: '1. Select keys in the bumpy section. 2. Use "Smooth Rough" slider toward Smooth. 3. Apply gradually — too much smoothing will kill the energy. 4. Check "Motion Trail" to verify the arc is now clean.',
    },
    {
      tool: 'animBot',
      feature: 'Polished Tangent',
      description: 'Replace noisy tangents with smooth calculated transitions.',
      url: 'https://animbot.ca',
      workflow: '1. Select the jerky keys. 2. Apply "Polished Tangent" — it recalculates tangents for the smoothest possible transitions. 3. This is great for cleaning up after copy/paste or mocap data.',
    },
    {
      tool: 'animBot',
      feature: 'Motion Trail',
      description: 'Visualize the arc to identify exactly where it breaks.',
      url: 'https://animbot.ca',
      workflow: '1. Enable "Motion Trail" on the control. 2. Scrub through and note where the trail jumps. 3. Fix those specific keys. 4. Keep Motion Trail on while adjusting to see real-time feedback.',
    },
  ],

  no_anticipation: [
    {
      tool: 'animBot',
      feature: 'Scale from Neighbor Left',
      description: 'Scale keys from the left neighbor to add a reverse wind-up.',
      url: 'https://animbot.ca',
      workflow: '1. Go 3–4 frames before the big movement. 2. Select the main body controls. 3. Use "Scale from Neighbor Left" with a value past 100% — this pushes the pose PAST the start key in the opposite direction. 4. A small amount (105–115%) creates subtle anticipation.',
    },
    {
      tool: 'animBot',
      feature: 'Tweener',
      description: 'Create an anticipation breakdown using overshoot on the Tweener.',
      url: 'https://animbot.ca',
      workflow: '1. Key the pre-anticipation pose. 2. Go to the anticipation frame (3–4 frames before the action). 3. Use "Tweener" with a NEGATIVE value (-10 to -20%) — this pushes the in-between past the start pose in reverse. TIP: Tweener supports overshoot values.',
    },
    {
      tool: 'animBot',
      feature: 'Micro Manipulator',
      description: 'Make precise small adjustments for subtle anticipation poses.',
      url: 'https://animbot.ca',
      workflow: '1. Go to the anticipation frame. 2. Select the controls. 3. Use "Micro Manipulator" to make very precise small movements in the opposite direction. 4. This is perfect for subtle wind-ups where you need fine control.',
    },
  ],

  abrupt_stop: [
    {
      tool: 'animBot',
      feature: 'Scale from Neighbor Right',
      description: 'Add overshoot past the stop pose for natural follow-through.',
      url: 'https://animbot.ca',
      workflow: '1. Select the keys at the stop frame. 2. Use "Scale from Neighbor Right" past 100% (105–120%) — this pushes the pose PAST the final position. 3. Then on the next 2–3 frames, use "Blend to Neighbors" to settle back. 4. This creates natural overshoot + settle.',
    },
    {
      tool: 'animBot',
      feature: 'Time Offsetter Stagger',
      description: 'Offset secondary parts to create overlapping action on stops.',
      url: 'https://animbot.ca',
      workflow: '1. Select the secondary controls in order (body → head → arms → fingers). 2. Use "Time Offsetter Stagger" — it offsets each control by a few frames in selection order. 3. This means the body settles first, then the head catches up, then the arms — creating beautiful overlapping action.',
    },
    {
      tool: 'animBot',
      feature: 'Flow Tangent',
      description: 'Apply flowing tangents that carry momentum through the stop.',
      url: 'https://animbot.ca',
      workflow: '1. Select the keys around the stop. 2. Apply "Flow Tangent" — it calculates tangents that inherit momentum from neighbor poses. 3. This naturally creates overshoot because the flow carries through. 4. For a more controlled stop, mix with "Polished Tangent".',
    },
  ],

  no_squash_stretch: [
    {
      tool: 'animBot',
      feature: 'Pull Push',
      description: 'Intensify (push) or soften (pull) poses to add squash/stretch.',
      url: 'https://animbot.ca',
      workflow: '1. At the impact frame, select the character controls. 2. Use "Pull Push" to intensify the squash — push the pose further in the compression direction. 3. On the stretch frames, push in the elongation direction. 4. "Pull Push" is like amp/deamp — it scales the pose relative to the previous key.',
    },
    {
      tool: 'animBot',
      feature: 'Scale from Average',
      description: 'Scale the squash/stretch relative to the average pose.',
      url: 'https://animbot.ca',
      workflow: '1. Select the impact/stretch keys. 2. Use "Scale from Average" to scale UP (amplify the squash/stretch). 3. Slide past 100% for more exaggeration, below for less. TIP: Moving all the way left will invert the curve relative to the average.',
    },
  ],

  poor_staging: [
    {
      tool: 'animBot',
      feature: 'Global Offset',
      description: 'Reposition the entire animation to improve staging.',
      url: 'https://animbot.ca',
      workflow: '1. Use "Global Offset" to shift the entire character performance without rekeying. 2. Move the character into a better composition — away from frame edges, into the rule-of-thirds sweet spots. 3. This is non-destructive.',
    },
  ],

  no_secondary_action: [
    {
      tool: 'animBot',
      feature: 'Time Offsetter Stagger',
      description: 'Create overlapping secondary motion by staggering controls.',
      url: 'https://animbot.ca',
      workflow: '1. Select secondary elements in order: body core → shoulders → head → arms → hands → fingers. 2. Use "Time Offsetter Stagger" — each control offsets 2–3 frames from the previous. 3. This instantly creates drag and follow-through on all secondary parts. 4. Great for hair, tails, clothing, and loose body parts.',
    },
    {
      tool: 'animBot',
      feature: 'Time Offsetter',
      description: 'Offset specific controls in time for overlapping action.',
      url: 'https://animbot.ca',
      workflow: '1. Select the secondary control (e.g., head, arm). 2. Use "Time Offsetter" to offset 2–4 frames later than the body. 3. This creates natural drag without changing any poses. TIP: "Time Offsetter" offsets timing without messing up your keys.',
    },
    {
      tool: 'animBot',
      feature: 'Noise Wave',
      description: 'Add subtle organic secondary motion.',
      url: 'https://animbot.ca',
      workflow: '1. Select a secondary control (e.g., antennae, tail tip). 2. Bake on ones first, then apply "Noise Wave" with a small amplitude. 3. This adds organic micro-movement that makes the character feel alive.',
    },
  ],

  under_exaggerated: [
    {
      tool: 'animBot',
      feature: 'Pull Push',
      description: 'Push key poses further to increase exaggeration.',
      url: 'https://animbot.ca',
      workflow: '1. Select the key poses (extremes, not breakdowns). 2. Use "Pull Push" slider to Push — this intensifies the pose by scaling it further from the previous key. 3. Focus on the extremes: highest point, lowest point, fastest moment. 4. Push 15–30% more.',
    },
    {
      tool: 'animBot',
      feature: 'Scale from Average',
      description: 'Scale animation curves to widen the dynamic range.',
      url: 'https://animbot.ca',
      workflow: '1. Select all keys on the peak action controls. 2. Use "Scale from Average" past 100% to amplify the curves. 3. This widens the gap between fast and slow moments — more contrast = more exaggeration.',
    },
    {
      tool: 'animBot',
      feature: 'Scale from Default',
      description: 'Scale poses away from the default/rest pose for bigger amplitude.',
      url: 'https://animbot.ca',
      workflow: '1. Select keys at the extreme poses. 2. Use "Scale from Default" past 100% — this pushes the pose further from the rig default. 3. Great for making a jump higher, a reach longer, or a squash deeper.',
    },
  ],

  proportion_change: [
    {
      tool: 'animBot',
      feature: 'Motion Trail',
      description: 'Track the control path to spot where proportions drift.',
      url: 'https://animbot.ca',
      workflow: '1. Enable "Motion Trail" on the control that shows proportion issues. 2. Step through frames — the trail will show where the path jumps unexpectedly. 3. Those jumps often correlate with proportion breaks. Fix the keys at those frames.',
    },
    {
      tool: 'animBot',
      feature: 'Blend to Neighbors',
      description: 'Smooth proportion jumps by blending toward neighboring poses.',
      url: 'https://animbot.ca',
      workflow: '1. Go to the frame where proportions look wrong. 2. Select the affected controls. 3. Use "Blend to Neighbors" to average the pose with its surrounding keys. 4. This smooths out sudden proportion changes.',
    },
  ],

  low_contrast: [
    {
      tool: 'animBot',
      feature: 'Pull Push',
      description: 'Push poses further apart to increase visual contrast.',
      url: 'https://animbot.ca',
      workflow: '1. Select key poses. 2. Use "Pull Push" to Push — this increases the difference between poses. 3. Bigger differences between poses = clearer silhouettes = better readability.',
    },
  ],

  mechanical_interpolation: [
    {
      tool: 'animBot',
      feature: 'Tweener',
      description: 'Replace linear in-betweens with biased breakdowns.',
      url: 'https://animbot.ca',
      workflow: '1. Go to the midpoint of the mechanical section. 2. Use "Tweener" at 35% instead of 50% — this creates an asymmetric breakdown. 3. For each body part, vary the bias slightly to create overlapping action. TIP: Tweener is the classic tween machine "taken to a whole new level."',
    },
    {
      tool: 'animBot',
      feature: 'Smooth Rough',
      description: 'Add organic variation to mechanical curves.',
      url: 'https://animbot.ca',
      workflow: '1. Select the evenly-spaced keys. 2. Use "Smooth Rough" slider toward Rough to add slight variation. 3. Then use "Smooth" at a lower amount to control the roughness. 4. The result: organic spacing instead of mathematical perfection.',
    },
    {
      tool: 'animBot',
      feature: 'Best Guess Tangent',
      description: 'Auto-detect the best tangent type to break mechanical interpolation.',
      url: 'https://animbot.ca',
      workflow: '1. Select the mechanical keys. 2. Apply "Best Guess Tangent" — animBot will analyze the relationship between keys and apply the most appropriate Maya tangent type. 3. This is usually better than blindly applying Auto tangent.',
    },
  ],

  general: [
    {
      tool: 'animBot',
      feature: 'Motion Trail',
      description: 'Visualize motion arcs for any control.',
      url: 'https://animbot.ca',
      workflow: 'Enable "Motion Trail" on any control to see its path through space. Essential for checking arcs.',
    },
    {
      tool: 'animBot',
      feature: 'Tweener',
      description: 'The classic tween machine for creating breakdowns.',
      url: 'https://animbot.ca',
      workflow: 'Use "Tweener" to create in-betweens at any bias between neighboring keys. Supports overshoot values.',
    },
  ],
};

/**
 * Map a principle + issue pattern to relevant tool suggestions.
 */
export function getToolSuggestions(
  principle: string,
  description: string,
  _severity: string
): ToolSuggestion[] {
  const desc = description.toLowerCase();

  if (principle === 'timing') {
    if (desc.includes('rushed') || desc.includes('fast')) return TOOL_MAP.rushed_timing;
    if (desc.includes('sluggish') || desc.includes('slow') || desc.includes('drag')) return TOOL_MAP.slow_timing;
  }

  if (principle === 'slow_in_slow_out') {
    if (desc.includes('no slow-in') || desc.includes('no ease-in') || desc.includes('starts at')) return TOOL_MAP.no_ease_in;
    if (desc.includes('no slow-out') || desc.includes('no ease-out') || desc.includes('ends at')) return TOOL_MAP.no_ease_out;
    if (desc.includes('constant velocity') || desc.includes('mechanical')) return TOOL_MAP.constant_velocity;
  }

  if (principle === 'arcs') {
    if (desc.includes('linear') || desc.includes('straight')) return TOOL_MAP.linear_arc;
    if (desc.includes('deviates') || desc.includes('erratic') || desc.includes('jerky') || desc.includes('bumpy')) return TOOL_MAP.erratic_arc;
  }

  if (principle === 'anticipation') return TOOL_MAP.no_anticipation;
  if (principle === 'follow_through') return TOOL_MAP.abrupt_stop;
  if (principle === 'squash_stretch') return TOOL_MAP.no_squash_stretch;
  if (principle === 'staging') return TOOL_MAP.poor_staging;
  if (principle === 'secondary_action') return TOOL_MAP.no_secondary_action;
  if (principle === 'exaggeration') return TOOL_MAP.under_exaggerated;
  if (principle === 'solid_drawing') return TOOL_MAP.proportion_change;
  if (principle === 'appeal') return TOOL_MAP.low_contrast;
  if (principle === 'straight_ahead_pose_to_pose') return TOOL_MAP.mechanical_interpolation;

  return TOOL_MAP.general;
}
