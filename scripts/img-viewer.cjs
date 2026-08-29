const fs = require('fs');
const path = require('path');
const http = require('http');

const PORT = 8889;
const ROOT = path.resolve(__dirname, '..');
const dir = path.join(ROOT, 'Traqqy_Readme_Screenshots');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.png')).sort();

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  
  if (url.pathname === '/') {
    const rows = files.map((f, i) => 
      `<a href="/${i}" style="display:block;margin:8px 0;padding:12px;background:#222;color:#f59e0b;text-decoration:none;border-radius:6px;">${i}: ${f}</a>`
    ).join('\n');
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(`<!DOCTYPE html><html><head><style>body{background:#111;color:#fff;font-family:sans-serif;padding:20px;}h1{color:#f59e0b;}</style></head><body><h1>Click a screenshot:</h1>${rows}</body></html>`);
  } else {
    const idx = parseInt(url.pathname.slice(1));
    if (idx >= 0 && idx < files.length) {
      const fname = files[idx];
      res.writeHead(200, {'Content-Type': 'text/html'});
      res.end(`<!DOCTYPE html><html><head><style>*{margin:0;padding:0;}body{background:#111;display:flex;justify-content:center;align-items:flex-start;}img{max-width:100vw;max-height:100vh;object-fit:contain;}</style></head><body><img src="/raw/${encodeURIComponent(fname)}"></body></html>`);
    } else if (url.pathname.startsWith('/raw/')) {
      const fname = decodeURIComponent(url.pathname.slice(5));
      const fpath = path.join(dir, fname);
      if (fs.existsSync(fpath)) {
        res.writeHead(200, {'Content-Type': 'image/png'});
        fs.createReadStream(fpath).pipe(res);
      } else {
        res.writeHead(404); res.end('Not found');
      }
    } else {
      res.writeHead(404); res.end('Not found');
    }
  }
});

server.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`));
