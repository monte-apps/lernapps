const http = require('node:http');
const fs = require('node:fs/promises');
const { createHash } = require('node:crypto');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const host = '127.0.0.1';
const port = Number(process.argv[2] ?? 8000);
const revisionPath = '/.preview/revision';
const localFiles = new Set(['node_modules', 'README.md', 'vorschau.cmd']);
const types = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.gif', 'image/gif'],
  ['.webp', 'image/webp'],
  ['.avif', 'image/avif'],
  ['.ico', 'image/x-icon'],
  ['.mp3', 'audio/mpeg'],
  ['.mp4', 'video/mp4'],
  ['.woff2', 'font/woff2'],
  ['.wasm', 'application/wasm'],
]);

function isPublic(name) {
  return !name.startsWith('.') && !localFiles.has(name);
}

async function revision() {
  const hash = createHash('sha256');

  async function scan(directory) {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    entries.sort((first, second) => first.name.localeCompare(second.name));
    for (const entry of entries) {
      if (!isPublic(entry.name)) continue;
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await scan(file);
      } else if (entry.isFile()) {
        const { mtimeNs, ctimeNs, size } = await fs.stat(file, { bigint: true });
        hash.update(JSON.stringify([path.relative(root, file), String(mtimeNs), String(ctimeNs), String(size)]));
      }
    }
  }

  await scan(root);
  return hash.digest('hex');
}

function withLiveReload(html, initialRevision) {
  const script = `<script>
(() => {
  const initialRevision = "${initialRevision}";
  async function check() {
    try {
      const response = await fetch("${revisionPath}", { cache: "no-store" });
      if (response.ok && (await response.text()) !== initialRevision) {
        location.reload();
        return;
      }
    } catch {
      // Try again if the preview server is briefly unavailable.
    }
    setTimeout(check, 1000);
  }
  setTimeout(check, 1000);
})();
</script>`;
  const closingBody = html.lastIndexOf('</body>');
  if (closingBody === -1) return html + script;
  return html.slice(0, closingBody) + script + html.slice(closingBody);
}

function send(request, response, status, body, type = 'text/plain; charset=utf-8', cache = 'no-store') {
  response.writeHead(status, {
    'Cache-Control': cache,
    'Content-Type': type,
    'Content-Length': Buffer.byteLength(body),
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(request.method === 'HEAD' ? undefined : body);
}

async function serve(request, response) {
  if (request.headers.host !== `${host}:${port}`) {
    return send(request, response, 403, 'Forbidden');
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.setHeader('Allow', 'GET, HEAD');
    return send(request, response, 405, 'Method Not Allowed');
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, `http://${host}`).pathname);
  } catch {
    return send(request, response, 400, 'Bad Request');
  }

  try {
    if (pathname === revisionPath) {
      return send(request, response, 200, await revision());
    }

    const parts = pathname.split('/').filter(Boolean);
    if (/[\\:\0]/u.test(pathname) || !parts.every(isPublic)) {
      return send(request, response, 404, 'Not Found');
    }
    if (pathname.endsWith('/')) parts.push('index.html');
    const file = path.join(root, ...parts);
    const realFile = await fs.realpath(file);
    const relative = path.relative(root, realFile);
    if (path.isAbsolute(relative) || !relative.split(path.sep).every(isPublic) || !(await fs.stat(realFile)).isFile()) {
      return send(request, response, 404, 'Not Found');
    }

    const extension = path.extname(realFile).toLowerCase();
    const type = types.get(extension) ?? 'application/octet-stream';
    if (extension === '.html') {
      const initialRevision = await revision();
      const html = await fs.readFile(realFile, 'utf8');
      return send(request, response, 200, withLiveReload(html, initialRevision), type);
    }
    const cache = /^\/thumbnails\/[\w-]+-[0-9a-f]{12}\.webp$/.test(pathname)
      ? 'public, max-age=31536000, immutable'
      : 'no-store';
    return send(request, response, 200, await fs.readFile(realFile), type, cache);
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
      return send(request, response, 404, 'Not Found');
    }
    console.error(error);
    return send(request, response, 500, 'Internal Server Error');
  }
}

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('Bitte einen Port zwischen 1 und 65535 angeben.');
  process.exit(1);
}

const server = http.createServer(serve);
server.on('error', (error) => {
  console.error(error.code === 'EADDRINUSE'
    ? `Port ${port} ist bereits belegt. Verwende einen anderen Port, z. B. 8001.`
    : error.message);
  process.exitCode = 1;
});
server.listen(port, host, () => {
  console.log(`LernApps-Vorschau: http://${host}:${port}/ (Strg+C zum Beenden)`);
});
