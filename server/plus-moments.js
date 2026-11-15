'use strict';
/*
 * The names of the Plus upgrade moments and their analytics events, kept in
 * one place so the web (public/plus-moments.js), the Android app and the
 * dashboard agree. "restrict" is a locked feature the person just touched;
 * "search", "good" and "liked" are the proactive, rate-limited ones; "pass" is
 * the low-commitment offer after the subscription was dismissed twice.
 */
const MOMENTS = ['restrict', 'search', 'good', 'liked', 'pass'];
const ACTIONS = ['view', 'dismiss', 'tap'];
const LABELS = {
  restrict: 'Hit a limit (locked feature)',
  search: 'While searching ("matched first")',
  good: 'After a good call or mutual heart',
  liked: 'Someone liked you (Home)',
  pass: 'Pass offer after two dismissals',
};

// plus_<moment>_<action> for the website, plus_app_<moment>_<action> for the Android app.
function eventNames() {
  const out = [];
  for (const prefix of ['plus_', 'plus_app_']) for (const m of MOMENTS) for (const a of ACTIONS) out.push(`${prefix}${m}_${a}`);
  return out;
}

module.exports = { MOMENTS, ACTIONS, LABELS, eventNames };
