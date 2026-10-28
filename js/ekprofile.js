// Exploding Kittens' part of the player profile (shared kit js/profile.js,
// never edit that one here): the computer levels' ratings, the achievements,
// the Daily game and turning a finished game into a result.
//
// What counts as one game: a whole game with one person vs computers. Leaving
// after your first move counts as a loss. Hint, Undo or Study mode make it
// "with help" (not rated). The guided first game and online rooms aren't
// counted. Pass-the-phone games count as played, with no winner of mine.

// Elo of each level from 4-player games, one level against three of another
// (tools/sim.js + scratch ladder, 2,000 games, 2026-10-27). A win share s
// against a fair 1/4 is read as a head-to-head score p = s / (s + (1 - s) / 3);
// difference = 400·log10(p / (1 − p)), rounded to 10. Easy anchored at 1200.
//   Medium 56.6% vs 3 Easy -> p 0.80 -> +240.   Hard 39.3% vs 3 Medium -> p 0.66 -> +120.
export const LEVELS = [
  { id: 'easy', name: 'Easy', rating: 1200 },
  { id: 'medium', name: 'Medium', rating: 1440 },
  { id: 'hard', name: 'Hard', rating: 1560 },
];
export const RANK = { easy: 0, medium: 1, hard: 2 };

const won = (c) => !!(c.last && c.last.won);
const ex = (c) => (c.last && c.last.extra) || {};
export const ACH = [
  { id: 'first', title: 'First win', desc: 'Win a game of Exploding Kittens', test: (c) => c.stats.wins >= 1 },
  { id: 'medium', title: 'Cat herder', desc: 'Win against Medium', test: (c) => won(c) && RANK[c.last.level] >= 1 },
  { id: 'hard', title: 'Top cat', desc: 'Win against Hard', test: (c) => won(c) && c.last.level === 'hard' },
  { id: 'clean', title: 'Not a scratch', desc: 'Win without drawing a single kitten', test: (c) => won(c) && ex(c).kittens === 0 },
  { id: 'lives', title: 'Nine lives', desc: 'Defuse 2 kittens in one game', test: (c) => ex(c).defuses >= 2 },
  { id: 'yup', title: 'Nope to your Nope', desc: 'Nope a Nope', test: (c) => ex(c).yups >= 1 },
  { id: 'thief', title: 'Pickpocket', desc: 'Steal a Defuse with a pair or three of a kind', test: (c) => ex(c).defSteals >= 1 },
  { id: 'party', title: 'Party animal', desc: 'Win a game with 7 or more players', test: (c) => won(c) && ex(c).players >= 7 },
  { id: 'streak', title: 'Hat trick', desc: 'Win 3 in a row', test: (c) => c.stats.bestStreak >= 3 },
  { id: 'daily', title: 'Daily habit', desc: '3-day Daily streak', test: (c) => c.daily.streak >= 3 },
];

// Today's Daily game: the same deck order for everyone that day. Original deck,
// standard rules, you + 3 Medium computers. The computers' choices follow
// from the game itself (app.js botRng), so the same moves meet the same replies.
export const DAILY = { edition: 'original', players: 4, level: 'medium', names: ['Ada', 'Bo', 'Cy'] };
export const dailyCfg = () => ({ edition: DAILY.edition, players: DAILY.players, fast: false, stack: true, five: true, twoBoth: false });

export function init(P, onDaily) {
  if (!P) return false;
  P.init({
    game: 'exploding-kittens', levels: LEVELS, achievements: ACH, draws: false,
    modes: { computer: { name: 'vs computer' }, help: { name: 'With help' }, friends: { name: 'Pass the phone' } },
    daily: { title: 'Daily game', onPlay: () => onDaily && onDaily() },
  });
  return true;
}

/** The level a game vs computers is rated at: the strongest computer at the table. */
export function tableLevel(levels) {
  let best = null;
  for (const l of levels || []) if (RANK[l] != null && (best == null || RANK[l] > RANK[best])) best = l;
  return best;
}

/** What one game adds up to for seat `me`, read from the engine's log. */
export function summary(log, me) {
  let kittens = 0, defuses = 0, yups = 0, defSteals = 0, players = 0;
  let lastSteal = -1;
  for (let i = 0; i < log.length; i++) {
    const e = log[i];
    if (e.t === 'setup') players = e.players;
    else if (e.t === 'draw' && e.seat === me && (e.res === 'E' || e.res === 'I' || e.res === 'U')) kittens++;
    else if (e.t === 'defuse' && e.seat === me) defuses++;
    else if (e.t === 'nope' && e.seat === me && e.nopes % 2 === 0) yups++;
    else if (e.t === 'named' && e.to === me && e.ok && e.name === 'DEF') defSteals++;
    else if (e.t === 'stole' && e.to === me) lastSteal = i;
    else if (e.t === 'moved' && e.toSeat === me && e.card === 'DEF' && lastSteal === i - 1) defSteals++;
  }
  return { kittens, defuses, yups, defSteals, players };
}

/** A finished (or abandoned) game -> Profile.recordResult input, or null if it doesn't count.
 *  g: the engine state; seats: [{type, level}]; helped, daily: booleans. */
export function result(g, seats, { helped = false, daily = false } = {}) {
  const people = seats.map((x, i) => (x.type !== 'bot' ? i : -1)).filter((i) => i >= 0);
  if (!people.length) return null;
  const over = g.phase === 'over';
  const me = people[0];
  const extra = summary(g.log, me);
  if (!over) extra.quit = true;
  if (people.length > 1) return { mode: 'friends', level: null, won: null, daily: false, extra };
  const mode = helped ? 'help' : 'computer';
  const level = mode === 'computer' ? tableLevel(seats.filter((x) => x.type === 'bot').map((x) => x.level)) : null;
  return { mode, level, won: over && g.winner === me, daily: !!daily, extra };
}
