// Plan morning-digest § 1. The contract every part of § 2 builds against.

/** One line of runs/<night>.jsonl. */
export type RunStatus = 'ok' | 'retry' | 'fail';

export type RunLine = {
  at: string; // ISO 8601 with the log's own offset; never converted for display
  job: string;
  status: RunStatus;
  owner: string | null;
  error?: string;
};

/** One row per job for a night. */
export type DigestRow = {
  job: string;
  /** null when the log says so; views show it as `—`. */
  owner: string | null;
  /** Lines for this job, any status. */
  runs: number;
  /** Lines with status `retry`. */
  retries: number;
  lastStatus: RunStatus;
  /** `error` of the last line that had one, or null. */
  lastError: string | null;
  /** `at` of the first and last line, as written in the log. */
  first: string;
  last: string;
};

export type Night = {
  night: string; // YYYY-MM-DD
  /** Sorted by job. Empty for an empty file ("nothing ran"). */
  rows: DigestRow[];
  /** Lines that did not parse as a RunLine. Counted, never thrown. */
  badLines: number;
};

/**
 * Reads runs/<night>.jsonl. Returns null when the night has no file (the routes answer 404).
 * Never throws on a bad line.
 */
export type ReadNight = (runsDir: string, night: string) => Night | null;
