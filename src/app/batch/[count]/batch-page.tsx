"use client";

import { type FC } from "react";

interface BatchPageProps {
  missingDiffs: string[];
  duration: number;
}

const BatchPage: FC<BatchPageProps> = ({ missingDiffs, duration }) => (
  <div>
    <h1>
      Generated {missingDiffs.length} diffs in {duration}
    </h1>

    {missingDiffs.length > 0 && (
      <div>
        <h2>Generated:</h2>
        <ul>
          {missingDiffs.map((missingDiff) => (
            <li key={missingDiff}>{missingDiff}</li>
          ))}
        </ul>
      </div>
    )}
  </div>
);

export default BatchPage;
