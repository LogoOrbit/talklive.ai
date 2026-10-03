'use strict';
/*
 * Where a visitor came from, and what brought them.
 *
 * Every human page view whose referrer is not this site is an *arrival*. For
 * each one we keep, aggregated per UTC day and never per person:
 *
 *   source       "Google", "Bing", "Facebook", "Direct", "reddit.com", ...
 *   medium       search | ai | social | referral | campaign | app | direct
 *   landing page the path they arrived on
 *   search term  the words they searched, when the referrer carries them
 *
 * About search terms: Google (and most engines) stopped passing the query in
 * the referrer years ago - the browser sends "https://www.google.com/" and
 * nothing else. So the on-site term list fills only from engines and links
 * that still pass one (Yandex, Baidu, some Yahoo and Ecosia results, ad
 * campaigns with utm_term). What people type into Google lives in Search
 * Console only; server/search-console.js reads it from there.
 */

// host pattern -> [label, medium, query params that may carry the search term]
// AI assistants come first: gemini.google.com must not read as Google search.
const ENGINES = [
  [/(^|\.)gemini\.google\.com$/, 'Gemini', 'ai', []],
  [/(^|\.)google\.[a-z.]+$/, 'Google', 'search', ['q']],
  [/(^|\.)bing\.com$/, 'Bing', 'search', ['q']],
  [/(^|\.)search\.yahoo\.[a-z.]+$|(^|\.)yahoo\.[a-z.]+$/, 'Yahoo', 'search', ['p', 'q']],
  [/(^|\.)duckduckgo\.com$/, 'DuckDuckGo', 'search', ['q']],
  [/(^|\.)yandex\.[a-z.]+$|(^|\.)ya\.ru$/, 'Yandex', 'search', ['text']],
  [/(^|\.)baidu\.com$/, 'Baidu', 'search', ['wd', 'word']],
  [/(^|\.)ecosia\.org$/, 'Ecosia', 'search', ['q']],
  [/(^|\.)search\.brave\.com$/, 'Brave Search', 'search', ['q']],
  [/(^|\.)naver\.com$/, 'Naver', 'search', ['query']],
  [/(^|\.)seznam\.cz$/, 'Seznam', 'search', ['q']],
  [/(^|\.)qwant\.com$/, 'Qwant', 'search', ['q']],
  [/(^|\.)startpage\.com$/, 'Startpage', 'search', ['query', 'q']],
  [/(^|\.)sogou\.com$/, 'Sogou', 'search', ['query']],
  [/(^|\.)so\.com$/, '360 Search', 'search', ['q']],
  [/(^|\.)petalsearch\.com$/, 'Petal Search', 'search', ['query', 'q']],
  [/(^|\.)aol\.[a-z.]+$/, 'AOL', 'search', ['q', 'query']],
  [/(^|\.)ask\.com$/, 'Ask', 'search', ['q']],
  [/(^|\.)chatgpt\.com$|(^|\.)openai\.com$/, 'ChatGPT', 'ai', []],
  [/(^|\.)perplexity\.ai$/, 'Perplexity', 'ai', ['q']],
  [/(^|\.)copilot\.microsoft\.com$/, 'Copilot', 'ai', []],
  [/(^|\.)claude\.ai$/, 'Claude', 'ai', []],
  [/(^|\.)facebook\.com$|(^|\.)fb\.(com|me)$|(^|\.)messenger\.com$/, 'Facebook', 'social', []],
  [/(^|\.)instagram\.com$/, 'Instagram', 'social', []],
  [/(^|\.)t\.co$|(^|\.)twitter\.com$|(^|\.)x\.com$/, 'X (Twitter)', 'social', []],
  [/(^|\.)reddit\.com$|(^|\.)redd\.it$/, 'Reddit', 'social', []],
  [/(^|\.)youtube\.com$|(^|\.)youtu\.be$/, 'YouTube', 'social', ['search_query']],
  [/(^|\.)tiktok\.com$/, 'TikTok', 'social', ['q']],
  [/(^|\.)linkedin\.com$|(^|\.)lnkd\.in$/, 'LinkedIn', 'social', []],
  [/(^|\.)pinterest\.[a-z.]+$/, 'Pinterest', 'social', []],
  [/(^|\.)whatsapp\.com$|(^|\.)wa\.me$/, 'WhatsApp', 'social', []],
  [/(^|\.)t\.me$|(^|\.)telegram\.(org|me)$/, 'Telegram', 'social', []],
  [/(^|\.)discord(app)?\.com$|(^|\.)discord\.gg$/, 'Discord', 'social', []],
  [/(^|\.)quora\.com$/, 'Quora', 'social', []],
  [/(^|\.)snapchat\.com$/, 'Snapchat', 'social', []],
  [/(^|\.)producthunt\.com$/, 'Product Hunt', 'referral', []],
];

// Android apps send android-app://<package>/ as the referrer.
const ANDROID_APPS = {
  'com.google.android.googlequicksearchbox': ['Google', 'search'],
  'com.google.android.gm': ['Gmail', 'referral'],
  'com.facebook.katana': ['Facebook', 'social'],
  'com.facebook.orca': ['Facebook', 'social'],
  'com.instagram.android': ['Instagram', 'social'],
  'com.twitter.android': ['X (Twitter)', 'social'],
  'com.reddit.frontpage': ['Reddit', 'social'],
  'com.whatsapp': ['WhatsApp', 'social'],
  'org.telegram.messenger': ['Telegram', 'social'],
  'com.zhiliaoapp.musically': ['TikTok', 'social'],
  'com.linkedin.android': ['LinkedIn', 'social'],
  'com.pinterest': ['Pinterest', 'social'],
  'com.discord': ['Discord', 'social'],
};

// utm_source values written by this site's own links (landing-page CTAs, the
// app's upgrade links). They mark navigation inside the site, not an arrival.
const INTERNAL_SOURCES = new Set(['seo', 'blog', 'app']);

const UTM_LABELS = {
  google: 'Google', bing: 'Bing', reddit: 'Reddit', youtube: 'YouTube', tiktok: 'TikTok',
  instagram: 'Instagram', facebook: 'Facebook', x: 'X (Twitter)', twitter: 'X (Twitter)',
  producthunt: 'Product Hunt', member_share: 'Member share', whatsapp: 'WhatsApp', telegram: 'Telegram',
};

const UTM_AI = {
  'chatgpt.com': 'ChatGPT', chatgpt: 'ChatGPT', openai: 'ChatGPT',
  'perplexity.ai': 'Perplexity', perplexity: 'Perplexity',
  'copilot.microsoft.com': 'Copilot', 'gemini.google.com': 'Gemini', 'claude.ai': 'Claude',
};

function cleanTerm(raw) {
  if (typeof raw !== 'string') return '';
  const t = raw.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  // A pasted URL or a wall of text is not a search term worth showing.
  if (!t || t.length > 80 || /^https?:/.test(t)) return '';
  return t;
}

function hostOf(url) {
  try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ''); } catch (_) { return ''; }
}

/*
 * Classify one page view. Returns null when it is navigation within the site,
 * otherwise { source, medium, term }.
 *
 *   referer   the Referer header ('' when absent)
 *   ownHosts  Set of hostnames that are this site (canonical, aliases, www)
 *   query     the request's query object (utm_* parameters)
 */
function classifyArrival({ referer, ownHosts, query = {} }) {
  const utmSource = String(query.utm_source || '').toLowerCase().trim().slice(0, 40);
  const utmTerm = cleanTerm(String(query.utm_term || ''));
  const ref = String(referer || '').trim();

  if (ref) {
    if (/^android-app:\/\//i.test(ref)) {
      const pkg = ref.slice('android-app://'.length).split('/')[0].toLowerCase();
      const hit = ANDROID_APPS[pkg];
      if (hit) return { source: hit[0], medium: hit[1], term: utmTerm };
      return { source: pkg ? `App: ${pkg.slice(0, 40)}` : 'App', medium: 'referral', term: utmTerm };
    }
    const host = hostOf(ref);
    if (host && ownHosts && ownHosts.has(host)) return null;
    if (host) {
      for (const [re, label, medium, params] of ENGINES) {
        if (!re.test(host)) continue;
        let term = utmTerm;
        if (!term && params.length) {
          try {
            const u = new URL(ref);
            for (const p of params) {
              term = cleanTerm(u.searchParams.get(p) || '');
              if (term) break;
            }
          } catch (_) { /* unparseable referrer: no term */ }
        }
        return { source: label, medium, term };
      }
      return { source: host.slice(0, 60), medium: 'referral', term: utmTerm };
    }
  }

  if (utmSource && INTERNAL_SOURCES.has(utmSource)) return null;
  // The installed app's start URL (site.webmanifest) carries utm_source=pwa.
  if (utmSource === 'pwa') return { source: 'Installed app', medium: 'app', term: '' };
  // ChatGPT and Perplexity tag the links they cite (utm_source=chatgpt.com)
  // and often send no referrer, so the tag is how they show up at all.
  if (UTM_AI[utmSource]) return { source: UTM_AI[utmSource], medium: 'ai', term: utmTerm };
  if (utmSource) return { source: UTM_LABELS[utmSource] || utmSource, medium: 'campaign', term: utmTerm };
  return { source: 'Direct', medium: 'direct', term: '' };
}

/*
 * A reload, or the back button, arrives with no referrer and would count as a
 * fresh "Direct" visit every time. Count one arrival per visitor and page per
 * half hour instead - close to what analytics tools call a session.
 */
const SESSION_MS = 30 * 60 * 1000;
const recent = new Map();
function isRepeatArrival(visitorKey, path, now = Date.now()) {
  const key = `${visitorKey}|${path}`;
  const last = recent.get(key);
  recent.set(key, now);
  if (recent.size > 50000) {
    for (const [k, ts] of recent) if (now - ts > SESSION_MS) recent.delete(k);
    if (recent.size > 50000) recent.clear();
  }
  return last !== undefined && now - last < SESSION_MS;
}

// One canonical form per page: lowercase, no trailing slash except the root
// and directory indexes the site really uses (/blog/, /languages/, /es/).
function normalizePath(pathname) {
  let p = String(pathname || '/').toLowerCase().replace(/\.html$/, '').replace(/\/index$/, '/');
  if (p.length > 100) p = p.slice(0, 100);
  return p || '/';
}

module.exports = { classifyArrival, isRepeatArrival, normalizePath, cleanTerm };
