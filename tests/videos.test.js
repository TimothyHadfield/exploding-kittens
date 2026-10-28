// The rules sheet has a Videos section: 2-5 YouTube links that open in a new tab.
import test from 'node:test';
import assert from 'node:assert/strict';
import { RULES } from '../js/ekcoach.js';

test('rules sheet has a Videos section with 2-5 YouTube links in a new tab', () => {
  const sec = RULES.sections.find((s) => s.id === 'videos');
  assert.ok(sec, 'no videos section');
  const links = [...sec.html.matchAll(/<a [^>]*>/g)].map((m) => m[0]);
  assert.ok(links.length >= 2 && links.length <= 5, `links: ${links.length}`);
  for (const a of links) {
    assert.match(a, /href="https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}"/);
    assert.match(a, /target="_blank"/);
    assert.match(a, /rel="noopener"/);
  }
});
