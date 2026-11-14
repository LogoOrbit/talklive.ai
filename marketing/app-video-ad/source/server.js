// Static server for ad.html: the app frames, brand art and the app's fonts.
const http = require('http'), fs = require('fs'), path = require('path');
const REPO = path.resolve(__dirname, '../../..');
const MOUNTS = {
  '/vui/': path.join(__dirname, 'ui_jpg'),
  '/brand/': path.join(REPO, 'marketing'),
  '/res/': path.join(REPO, 'android-native/app/src/main/res'),
  '/': __dirname,
};
const TYPES = { '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.jpg': 'image/jpeg', '.ttf': 'font/ttf' };
module.exports = () => new Promise((res) => {
  const s = http.createServer((req, rsp) => {
    const u = decodeURIComponent(req.url.split('?')[0]);
    const m = Object.keys(MOUNTS).find((k) => u.startsWith(k));
    const f = path.join(MOUNTS[m], u.slice(m.length));
    if (!f.startsWith(MOUNTS[m])) { rsp.writeHead(403); rsp.end(); return; }
    fs.readFile(f, (e, d) => {
      if (e) { rsp.writeHead(404); rsp.end(); return; }
      rsp.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); rsp.end(d);
    });
  });
  s.listen(0, '127.0.0.1', () => res({ server: s, port: s.address().port }));
});
