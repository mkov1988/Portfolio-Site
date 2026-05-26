// Tiny static server used by .claude/launch.json (Claude Preview MCP).
// Serves the portfolio root. Port comes from PORT env, defaults to 4321.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT) || 4321;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.mjs':  'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.webp': 'image/webp',
  '.ico':  'image/x-icon',
  '.woff':  'font/woff',
  '.woff2': 'font/woff2',
  '.ttf':   'font/ttf',
  '.otf':   'font/otf',
  '.map':   'application/json; charset=utf-8',
};

// Resolve a request path to a real file on disk. Tries, in order:
//   1. the literal path (e.g. /tools.html)
//   2. path + ".html" if no extension (e.g. /tools → /tools.html)
//   3. path + "/index.html" if it's a directory
// Returns the resolved absolute file path, or null if none exists.
// This brings the dev server closer to "every link a user might guess
// just works" without needing to remember .html extensions, while
// still mirroring the actual files GitHub Pages serves at the canonical
// .html URLs that the site's own nav uses.
function resolveFile(reqPath) {
  let p = reqPath;
  if (p.endsWith('/')) p += 'index.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT)) return null; // path traversal guard
  try { if (fs.statSync(fp).isFile()) return fp; } catch (_) {}

  // Extension-less guess (/tools → /tools.html)
  if (!path.extname(p)) {
    const html = path.join(ROOT, p + '.html');
    if (html.startsWith(ROOT)) {
      try { if (fs.statSync(html).isFile()) return html; } catch (_) {}
    }
    // Directory-style index (/tools → /tools/index.html)
    const idx = path.join(ROOT, p, 'index.html');
    if (idx.startsWith(ROOT)) {
      try { if (fs.statSync(idx).isFile()) return idx; } catch (_) {}
    }
  }
  return null;
}

http.createServer((req, res) => {
  const reqPath = decodeURIComponent(req.url.split('?')[0]);
  if (reqPath.includes('..')) {
    res.writeHead(403); return res.end('403');
  }
  const fp = resolveFile(reqPath);
  if (!fp) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('404 ' + reqPath);
  }
  fs.readFile(fp, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('404 ' + reqPath);
    }
    const ct = TYPES[path.extname(fp).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': ct, 'Cache-Control': 'no-store' });
    res.end(data);
  });
}).listen(PORT, () => {
  console.log(`[devserver] http://localhost:${PORT}/  (root: ${ROOT})`);
});
