import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

let dir: string;
let app: ReturnType<typeof createApp>;

const good = (at: string, job: string, status: string, owner: string | null, error?: string) =>
  JSON.stringify({ at, job, status, owner, ...(error ? { error } : {}) });

beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rig-digest-'));
  fs.writeFileSync(
    path.join(dir, '2026-01-01.jsonl'),
    [
      good('2026-01-01T02:00:00+01:00', 'b/job', 'ok', 'bea'),
      good('2026-01-01T02:05:00+01:00', 'a/job', 'fail', 'al', 'boom'),
    ].join('\n') + '\n',
  );
  fs.writeFileSync(path.join(dir, '2026-01-02.jsonl'), '');
  fs.writeFileSync(
    path.join(dir, '2026-01-03.jsonl'),
    good('2026-01-03T02:00:00+01:00', 'a/job', 'ok', 'al') + '\n{"at":\n',
  );
  app = createApp({
    adapter: 'shim',
    installed: '2026-10-29T14:06:00+01:00',
    beatEverySeconds: 60,
    runsDir: dir,
  });
});

afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

type NightJson = { night: string; rows: { job: string }[]; badLines: number };

describe('digest page', () => {
  it('200 with both jobs in order and a warn row for the failure', async () => {
    const res = await app.request('/digest/2026-01-01');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('a/job');
    expect(html).toContain('b/job');
    expect(html.indexOf('a/job')).toBeLessThan(html.indexOf('b/job'));
    expect(html).toMatch(/<tr[^>]*class="warn"[^>]*>[\s\S]*?a\/job/);
  });

  it('404 for a night with no file', async () => {
    const res = await app.request('/digest/2026-01-09');
    expect(res.status).toBe(404);
    expect(await res.text()).toContain('no run log for 2026-01-09');
  });

  it('empty night says nothing ran', async () => {
    const res = await app.request('/digest/2026-01-02');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });

  it('bad line night counts the line', async () => {
    const res = await app.request('/digest/2026-01-03');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("1 line(s) didn&#39;t parse".replace('&#39;', "'"));
  });
});

describe('digest json', () => {
  it('200 with rows ordered by job', async () => {
    const res = await app.request('/api/digest/2026-01-01');
    const body = (await res.json()) as NightJson;
    expect(res.status).toBe(200);
    expect(body.rows.map((r) => r.job)).toEqual(['a/job', 'b/job']);
    expect(body.badLines).toBe(0);
  });

  it('404 for a night with no file', async () => {
    const res = await app.request('/api/digest/2026-01-09');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'no run log', night: '2026-01-09' });
  });

  it('empty night has no rows', async () => {
    const res = await app.request('/api/digest/2026-01-02');
    const body = (await res.json()) as NightJson;
    expect(res.status).toBe(200);
    expect(body.rows).toEqual([]);
  });

  it('bad line night reports badLines 1 and one row', async () => {
    const res = await app.request('/api/digest/2026-01-03');
    const body = (await res.json()) as NightJson;
    expect(res.status).toBe(200);
    expect(body.badLines).toBe(1);
    expect(body.rows).toHaveLength(1);
  });
});

describe('page and json agree', () => {
  it('list the same jobs in the same order', async () => {
    const body = (await (await app.request('/api/digest/2026-01-01')).json()) as NightJson;
    const html = await (await app.request('/digest/2026-01-01')).text();
    const positions = body.rows.map((r) => html.indexOf(r.job));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });
});
