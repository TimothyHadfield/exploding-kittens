// The 2026-10-27 improvement pass on real screens, one browser at a time:
//   node tests/improve-ui.mjs <url> [--shots dir] [--only 393x659]
// - a fresh visit opens on Play and offers the guided game once; "Teach me" walks all 10 steps doing
//   what each asks (See the Future, a pair, Draw); every note is on screen, no sideways scroll
// - Undo vs computers puts the game back to just before your move (and marks the game "with help")
// - a game played to the end lands in My stats once, the end sheet has Replay, and the replay steps
// - the Daily is the same deal as Profile.daily.seed(), with no Undo button
// - the big kitten moments draw over the table; the rules sheet's tabs don't scroll sideways
// - no console errors
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join } from 'node:path';
const require = createRequire(join(homedir(), '.claude/tools/') + 'x.js');
const pw = require('playwright');

const args = process.argv.slice(2);
const url = (args.find((a) => a.startsWith('http')) || 'http://127.0.0.1:47213/').replace(/[#?].*$/, '') + '?nosw';
const shots = args.includes('--shots') ? args[args.indexOf('--shots') + 1] : null;
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
let failed = 0;
const check = (ok, msg) => { console.log((ok ? 'PASS ' : 'FAIL ') + msg); if (!ok) failed++; };
const SIZES = [
  ['393x659', 'webkit', 393, 659, true], ['320x568', 'webkit', 320, 568, true],
  ['659x393', 'webkit', 659, 393, true], ['1280x800', 'chromium', 1280, 800, false],
].filter((s) => !only || s[0] === only);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function until(page, fn, ms = 8000, arg) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (await page.evaluate(fn, arg).catch(() => false)) return true; await wait(80); }
  return false;
}
const bubble = () => {
  const b = document.querySelector('.coach-layer:not(.coach-off) .coach-bubble');
  if (!b) return null;
  const r = b.getBoundingClientRect();
  return { l: r.left, t: r.top, r: r.right, b: r.bottom, vw: innerWidth, vh: innerHeight, sx: document.documentElement.scrollWidth, i: EK.tour() ? EK.tour().index : -1 };
};

async function run([label, engine, w, h, mobile]) {
  const browser = await pw[engine].launch();
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: mobile && engine !== 'chromium' ? true : undefined, hasTouch: mobile });
  const page = await ctx.newPage();
  page.setDefaultTimeout(8000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const shot = async (n) => { if (shots) await page.screenshot({ path: join(shots, `${label}-${n}.png`) }); };
  try {
    // ---- fresh visit: Play tab, offer once
    await page.goto(url);
    await until(page, () => !!window.EK && !!document.querySelector('.coach-offer'));
    check(await page.evaluate(() => EK.S.tab === 'play' && !!document.querySelector('.coach-offer')), `${label}: opens on Play with the guided-game offer`);
    await shot('offer');
    // a game left on the Learn tab still opens on Play
    await page.evaluate(() => { const d = JSON.parse(localStorage.getItem('ek:v1')); d.tab = 'learn'; localStorage.setItem('ek:v1', JSON.stringify(d)); });
    await page.reload();
    await until(page, () => !!window.EK);
    check(await page.evaluate(() => EK.S.tab === 'play'), `${label}: saved tab Learn still opens on Play`);
    check(await page.evaluate(() => !document.querySelector('.coach-offer')), `${label}: the offer comes only once`);
    // Settings -> Guided first game
    await page.click('nav.tabs [data-tab="settings"]'); await wait(200);
    await page.click('[data-tutorial]');
    await until(page, () => EK.S.mode === 'tutorial' && EK.tour().active);
    await page.evaluate(() => { EK.S.settings.speed = 'fast'; });
    // ---- walk the guided game
    const seen = new Set();
    const t0 = Date.now();
    while (Date.now() - t0 < 60000) {
      const st = await page.evaluate(() => ({ active: EK.tour().active, i: EK.tour().index, b: !!document.querySelector('.coach-layer:not(.coach-off) .coach-bubble'), next: !!document.querySelector('.coach-layer:not(.coach-off) [data-coach="next"]'), sheet: (document.querySelector('#sheet h3') || {}).textContent || '', my: EK.S.game && EK.S.game.phase === 'turn' && EK.S.game.cur === 0 }));
      if (!st.active) break;
      if (st.b && !seen.has(st.i)) {
        seen.add(st.i);
        const g = await page.evaluate(bubble);
        check(g && g.l >= 0 && g.t >= 0 && g.r <= g.vw + 0.5 && g.b <= g.vh + 0.5 && g.sx <= g.vw, `${label}: step ${st.i + 1} note on screen`);
        await shot(`step${st.i + 1}`);
      }
      if (st.b && st.next) { await wait(350); await page.click('.coach-layer [data-coach="next"]'); await wait(200); continue; }
      if (st.i === 3 && st.b) { // See the Future, then Play
        // the hand is fanned (a centre tap lands on the next card), so the cards get a plain click event
        await page.dispatchEvent('#hand .card[aria-label="See the Future"]', 'click'); await wait(120); await page.click('#p-acts [data-play]'); await wait(500); continue;
      }
      if (st.i === 4 && st.sheet.startsWith('The top')) { await wait(400); await page.click('#sheet [data-close]'); await wait(300); continue; }
      if (st.i === 5 && st.b && st.my) {
        const ids = await page.evaluate(() => [...document.querySelectorAll('#hand .card[aria-label="Cattermelon"]')].map((e) => e.dataset.card));
        for (const id of ids.slice(0, 2)) { await page.dispatchEvent(`#hand .card[data-card="${id}"]`, 'click'); await wait(120); }
        await page.click('#p-acts [data-play]'); await wait(450);
        await page.click('#sheet [data-target]'); await wait(500); continue;
      }
      if (st.i === 6 && st.b && st.my) { await wait(500); await page.click('#p-acts [data-draw]'); await wait(600); continue; }
      if (st.sheet && /Defused|Nope it|Nope back|Favor/.test(st.sheet)) { // answer whatever the computers ask
        const b = await page.$('#sheet [data-insert], #sheet [data-pass], #sheet [data-give]'); if (b) await b.click(); await wait(300); continue;
      }
      await wait(150);
    }
    check(seen.size >= 9, `${label}: guided game showed ${seen.size} of 10 steps`);
    check(await page.evaluate(() => !EK.tour().active), `${label}: guided game finished`);
    check(await page.evaluate(() => EK.S.recorded === false && (!window.Profile || window.Profile.stats().games === 0)), `${label}: guided game not counted in My stats`);

    // ---- Undo vs computers
    await page.evaluate(() => { localStorage.removeItem('ek:v1'); });
    await page.goto(url); await until(page, () => !!window.EK);
    await page.evaluate(() => { if (window.COACH) COACH.closeOffer(); EK.S.settings.speed = 'fast'; EK.S.setup.players = 2; EK.S.setup.edition = 'original'; EK.S.setup.seats = [{ type: 'me', name: 'You' }, { type: 'bot', level: 'medium', name: 'Ada' }]; EK.S.screen = null; EK.startGame(); });
    await until(page, () => EK.S.game && EK.S.game.phase === 'turn' && EK.S.game.cur === 0, 15000);
    const before = await page.evaluate(() => EK.S.game.log.length);
    check(await page.evaluate(() => !!document.querySelector('#p-acts [data-undo][disabled]')), `${label}: Undo shown, off before your first move`);
    await page.click('#p-acts [data-draw]'); await wait(700);
    await until(page, () => !!document.querySelector('#p-acts [data-undo]:not([disabled])'), 4000);
    await shot('undo');
    await page.click('#p-acts [data-undo]'); await wait(400);
    check(await page.evaluate((n) => EK.S.game.log.length === n && EK.S.helped === true, before), `${label}: Undo puts the game back before the draw and marks it "with help"`);

    // ---- play to the end, My stats once, Replay
    await page.evaluate(() => { EK.S.helped = false; });
    const t1 = Date.now();
    while (Date.now() - t1 < 90000) {
      const s = await page.evaluate(() => ({ over: EK.S.game.phase === 'over', my: EK.S.game.phase === 'turn' && EK.S.game.cur === 0 && !document.querySelector('#sheet'), sheet: !!document.querySelector('#sheet [data-insert], #sheet [data-pass], #sheet [data-give], #sheet [data-close]') }));
      if (s.over) break;
      if (s.sheet) { await page.click('#sheet [data-insert], #sheet [data-pass], #sheet [data-give], #sheet [data-close]').catch(() => {}); await wait(250); continue; }
      if (s.my) { await page.click('#p-acts [data-draw]').catch(() => {}); await wait(500); continue; }
      await wait(150);
    }
    check(await page.evaluate(() => EK.S.game.phase === 'over'), `${label}: game played to the end`);
    await until(page, () => !!document.querySelector('#sheet [data-replay]'), 4000);
    check(await page.evaluate(() => window.Profile.stats().games === 1 && EK.S.recorded), `${label}: one result in My stats`);
    await shot('over');
    await page.click('#sheet [data-replay]'); await wait(300);
    const rp = await page.evaluate(() => ({ h: (document.querySelector('#sheet h3') || {}).textContent || '', seats: document.querySelectorAll('#sheet .rp-seat').length }));
    check(/Replay/.test(rp.h) && rp.seats === 2, `${label}: replay opens (${rp.h.trim()})`);
    await wait(350); // a sheet that just popped up ignores taps for 320 ms (double-tap guard)
    await page.click('#sheet [data-rp="first"]'); await wait(150);
    await page.click('#sheet [data-rp="next"]'); await wait(150); // stepping is the same sheet: no guard
    const rq = await page.evaluate(() => ({ h: document.querySelector('#sheet h3').textContent, sw: document.documentElement.scrollWidth, vw: innerWidth }));
    check(/move 1 of/.test(rq.h) && rq.sw <= rq.vw, `${label}: replay steps, no sideways scroll (${rq.h.trim()}; ${rq.sw}/${rq.vw})`);
    await shot('replay');
    await page.click('#sheet [data-close]'); await wait(400);
    check(await page.evaluate(() => !!document.querySelector('#sheet [data-again]')), `${label}: closing the replay goes back to the end sheet`);

    // ---- Daily: same deal as the date seed, no Undo
    await page.click('#sheet [data-setup]'); await wait(300);
    await shot('setup');
    await page.click('[data-daily]'); await wait(500);
    check(await page.evaluate(() => EK.S.mode === 'daily' && EK.S.game.seed === (window.Profile.daily.seed() | 0) && !document.querySelector('#p-acts [data-undo]')), `${label}: Daily = today's seed, no Undo`);

    // ---- big moments
    await page.evaluate(() => { EK.FXDOM.moment({ kind: 'boom', mine: true }); });
    await wait(900); await shot('boom');
    check(await page.evaluate(() => !!document.querySelector('.moment.boom svg')), `${label}: kitten explosion moment draws`);
    await wait(1200);
    check(await page.evaluate(() => !document.querySelector('.moment')), `${label}: moment cleans itself up`);
    await page.evaluate(() => { EK.FXDOM.moment({ kind: 'defuse', mine: true }); });
    await wait(700); await shot('defuse');

    // ---- rules sheet: tabs wrap, no sideways scroll
    await page.click('#p-status [data-newgame]'); await wait(300);
    await page.click('#v-play [data-rules]'); await wait(400);
    const rs = await page.evaluate(() => { const n = document.querySelector('.coach-rules-nav'); return n ? { sw: n.scrollWidth, cw: n.clientWidth, page: document.documentElement.scrollWidth, vw: innerWidth } : null; });
    check(rs && rs.sw <= rs.cw + 1 && rs.page <= rs.vw, `${label}: rules tabs fit (${rs && rs.sw}/${rs && rs.cw})`);
    await shot('rules');
  } catch (e) { check(false, `${label}: ${e.message.split('\n')[0]}`); }
  check(!errors.length, `${label}: no console errors${errors.length ? ' — ' + errors.slice(0, 3).join(' | ') : ''}`);
  await browser.close();
}

for (const s of SIZES) await run(s);
console.log(failed ? `${failed} FAILED` : 'ALL PASS');
process.exit(failed ? 1 : 0);
