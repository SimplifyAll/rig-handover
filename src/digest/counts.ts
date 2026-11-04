import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseLine } from './read.js';

export type NightCounts = { ok: number; retry: number; fail: number };

// Counts of log lines by status for a night; bad lines are not counted. null = no file.
export function countNight(runsDir: string, night: string): NightCounts | null {
  let text: string;
  try {
    text = readFileSync(join(runsDir, `${night}.jsonl`), 'utf8');
  } catch {
    return null;
  }
  const counts: NightCounts = { ok: 0, retry: 0, fail: 0 };
  for (const rawLine of text.split('\n')) {
    if (rawLine.trim() === '') continue;
    const line = parseLine(rawLine);
    if (line) counts[line.status]++;
  }
  return counts;
}
