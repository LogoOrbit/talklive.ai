#!/usr/bin/env node
// Manually push all sitemap URLs to the IndexNow network: `npm run seo:ping`.
// The production server also does this automatically ~1 minute after boot,
// so every deploy re-submits the site without any manual step.
'use strict';
require('../server/indexnow').ping((err, status) => {
  process.exit(err ? 1 : 0);
});
