import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const config = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: 'runs' };

describe('digest page', () => {
  it('renders 2026-10-28 with warn rows', async () => {
    const res = await createApp(config).request('/digest/2026-10-28');
    const html = await res.text();
    expect(res.status).toBe(200);
    const jobs = [...html.matchAll(/<tr[^>]*><td>([^<]+)<\/td>/g)].map((m) => m[1]);
    expect(jobs.length).toBe(5);
    expect(jobs).toEqual([...jobs].sort());
    expect(html).toMatch(/<tr class="warn"><td>notes\/backup</);
    expect(html).toMatch(/<tr class="warn"><td>fixtures\/refresh</);
  });
});
