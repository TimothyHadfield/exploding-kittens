# Exploding Kittens Lab

Study site for Exploding Kittens: play vs computers / pass-the-phone / online rooms, exact kitten odds, a real-table bomb-odds tracker, and a Learn tab with simulation data. Static site, no build step, $0.

- **Live:** https://timothyhadfield.github.io/exploding-kittens/ (GitHub Pages from `main`, repo `TimothyHadfield/exploding-kittens`, public)
- **Read first:** `progress.md` (state, traps), `docs/rules-check.md` (every rule with sources), `docs/ideas.md`.
- **Test:** `npm test` (node --test, ~30 s, 31 tests). Strength data: `node tools/sim.js 2000` (~4.5 min) rewrites `data/*.json`.
- **Look:** serve the folder (`python -m http.server <port> --bind 127.0.0.1`, background) then `node ~/.claude/tools/phone-view.mjs http://127.0.0.1:<port>/ --out x.png` and `--desktop`.
- **Online:** `js/online.js` is a copy of `Board and Card Games/_online/online.js` — never edit it here; re-copy when the shared one changes. Adapter: `js/netgame.js`.
- Rules engine is pure (`js/engine.js`); anything rule-related goes in `docs/rules-check.md` with a source and a test.
