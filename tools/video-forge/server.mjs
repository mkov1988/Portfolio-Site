// Tiny recorder host: serves the recorder page + the portfolio's images on one
// origin (so the canvas stays untainted), and accepts the recorded webm via POST.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const SITE = 'C:\\Users\\Michael\\Desktop\\Portfolio site\\Portfolio-Site';
const OUT = path.join(SITE, 'assets', 'videos', 'lpl', 'lpl-tour.mp4');
const PORT = 4599;

const TYPES = { '.html': 'text/html; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.mjs': 'application/javascript' };

http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  if (req.method === 'POST' && p === '/save') {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      const buf = Buffer.concat(chunks);
      fs.mkdirSync(path.dirname(OUT), { recursive: true });
      fs.writeFileSync(OUT, buf);
      console.log(`[forge] SAVED ${OUT} (${(buf.length / 1048576).toFixed(1)} MB)`);
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('saved ' + buf.length);
    });
    return;
  }
  // static: /recorder.html from here; /assets/... from the site
  let fp = p === '/' || p === '/recorder.html' ? path.join(HERE, 'recorder.html')
         : p.startsWith('/assets/') ? path.join(SITE, p) : null;
  if (!fp || !fs.existsSync(fp)) { res.writeHead(404); return res.end('404'); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(fp)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  res.end(fs.readFileSync(fp));
}).listen(PORT, () => console.log(`[forge] http://localhost:${PORT}/recorder.html`));
