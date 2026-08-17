const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');

function htmlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return htmlFiles(fullPath);
    return entry.isFile() && entry.name.endsWith('.html') ? [fullPath] : [];
  });
}

let updated = 0;
for (const file of htmlFiles(publicDir)) {
  const before = fs.readFileSync(file, 'utf8');
  let html = before;

  html = html.replace(/<!--([\s\S]*?)-->/g, (comment) =>
    /AdSense|adsbygoogle/i.test(comment) ? '' : comment
  );
  html = html.replace(
    /<ins\b[^>]*class="adsbygoogle"[^>]*><\/ins>\s*<script>\(adsbygoogle = window\.adsbygoogle \|\| \[\]\)\.push\(\{\}\);<\/script>/gi,
    (unit) => `<div data-ad="${/8131758533/.test(unit) ? 'native' : 'leaderboard'}"></div>`
  );
  html = html.replace(/^.*pagead2\.googlesyndication\.com.*\r?\n?/gim, '');
  html = html.replace(/^[ \t]+$/gm, '');

  if (!/src=["']\/ads\.js["']/.test(html)) {
    html = html.replace('</head>', '<script defer src="/ads.js"></script>\n</head>');
  }

  if (html !== before) {
    fs.writeFileSync(file, html);
    updated += 1;
  }
}

console.log(`Migrated ${updated} HTML files to Adsterra-only placements.`);
