'use client';

import { useState } from 'react';

interface JsonOutputProps {
  data: unknown;
}

export default function JsonOutput({ data }: JsonOutputProps) {
  const [expanded, setExpanded] = useState(false);

  // Strip base64 keyframe previews from JSON display to keep it readable
  const displayData = JSON.parse(JSON.stringify(data));
  if (displayData.keyframe_previews) {
    displayData.keyframe_previews = `[${displayData.keyframe_previews.length} images omitted]`;
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Raw JSON Output</h2>
        <button
          onClick={() => setExpanded(!expanded)}
          style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }}
        >
          {expanded ? 'Collapse' : 'Expand'}
        </button>
      </div>
      {expanded && (
        <div className="json-output" style={{ marginTop: '0.75rem' }}>
          <pre>{JSON.stringify(displayData, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
