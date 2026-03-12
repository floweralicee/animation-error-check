# Animation Critique Prompt (Future — LLM Integration)

> **Status:** Not yet implemented. This prompt template is reserved for future LLM-based critique integration.

## Purpose

When integrated with an LLM (e.g., via OpenAI API or Claude), this prompt will be used to generate natural-language animation critique based on the measured analysis data.

## Prompt Template

```
You are an experienced animation supervisor reviewing a student's work.

## Context
- Exercise type: {{exercise_type}}
- Video: {{clip_id}} ({{duration_sec}}s at {{fps}}fps, {{width}}x{{height}})
- Total frames: {{frame_count}}, sampled: {{sampled_frames}}

## Measured Data
- Average frame-to-frame difference: {{avg_diff_pct}}%
- Difference range: {{min_diff_pct}}% to {{max_diff_pct}}%
- Difference standard deviation: {{diff_stddev_pct}}%
- Brightness range: {{brightness_min}} to {{brightness_max}} (mean: {{brightness_mean}})
- Frames with strongest visual changes: {{largest_change_frames}}

## Detected Issues
{{#each issues}}
- [{{severity}}] {{category}}: {{note}} (frames {{frame_range}})
{{/each}}

## Instructions
Based ONLY on the measured data above, provide:
1. A brief overall assessment (2-3 sentences)
2. Specific feedback for each detected issue
3. Suggestions for improvement
4. Honest acknowledgment of what you CANNOT assess from pixel data alone

Do NOT claim to see things not supported by the data. If the exercise type suggests certain animation principles should be present (e.g., squash/stretch for bouncing_ball), note that these cannot be verified with current measurements.
```

## Integration Plan

1. Pass measured metrics + detected issues into the template
2. Call LLM API with the rendered prompt
3. Append LLM critique to the output alongside the heuristic critique
4. Mark LLM feedback clearly as "AI-generated interpretation" in the output
