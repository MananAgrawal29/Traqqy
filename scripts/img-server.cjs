const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8888;
const ROOT = path.resolve(__dirname, '..');

const mimeTypes = {
  '.html': 'text/html',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.css': 'text/css',
  '.js': 'application/javascript'
};

const screenshots = [];
const dir = path.join(ROOT, 'Traqqy_Readme_Screenshots');
if (fs.existsSync(dir)) {
  fs.readdirSync(dir).filter(f => f.endsWith('.png')).forEach(f => screenshots.push(f));
}

let currentIndex = 0;

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  
  if (url.pathname === '/') {
    // Serve index page with all screenshots
    const imgTags = screenshots.map((f, i) => `
      <div style="margin-bottom:30px;border:2px solid #f59e0b;padding:15px;border-radius:8px;">
        <h2 style="color:#f59e0b;margin:0 0 10px;">Screenshot ${i+1}: ${f}</h2>
        <img src="/img/${encodeURIComponent(f)}" style="width:100%;max-width:1400px;display:block;">
      </div>
    `).join('\n');
    
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(`<!DOCTYPE html><html><head><title>Screenshot ID</title>
      <style>body{background:#111;color:#fff;font-family:sans-serif;padding:20px;margin:0;}</style>
    </head><body><h1>Traqqy Screenshots (${screenshots.length} total)</h1>${imgTags}</body></html>`);
  } else if (url.pathname.startsWith('/img/')) {
    const fname = decodeURIComponent(url.pathname.slice(5));
    const fpath = path.join(dir, fname);
    if (fs.existsSync(fpath)) {
      res.writeHead(200, {'Content-Type': 'image/png'});
      fs.createReadStream(fpath).pipe(res);
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => console.log(`Image server on http://localhost:${PORT}`));
