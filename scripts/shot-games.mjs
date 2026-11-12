import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { writeFileSync } from 'node:fs';

const DIST = resolve('D:/cxdownload/yemian/dist');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 8088;

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.json': 'application/json', '.xml': 'application/xml',
};

const server = createServer(async (req, res) => {
  res.on('finish', () => console.log('REQ', req.url, '->', res.statusCode));
  try {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p.startsWith('/test')) p = p.slice(5) || '/';
    if (p.endsWith('/')) p += 'index.html';
    const fp = normalize(join(DIST, p));
    if (!fp.startsWith(DIST)) { res.writeHead(403); return res.end(); }
    let data;
    try { data = await readFile(fp); }
    catch {
      try { data = await readFile(fp + '.html'); }
      catch { res.writeHead(404); return res.end('404'); }
    }
    res.writeHead(200, { 'content-type': MIME[extname(fp)] || 'application/octet-stream' });
    res.end(data);
  } catch (e) { res.writeHead(500); res.end(String(e)); }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
console.log('server up on', PORT);

const proc = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-sandbox',
  '--no-proxy-server', '--proxy-server=direct://', '--proxy-bypass-list=*',
  '--remote-debugging-port=9222', '--window-size=1280,900', 'about:blank',
], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1500));

const list = await (await fetch('http://127.0.0.1:9222/json')).json();
const wsUrl = list.find((t) => t.type === 'page')?.webSocketDebuggerUrl || list[0].webSocketDebuggerUrl;
const ws = new WebSocket(wsUrl);
let id = 0; const pend = new Map();
const send = (m, p = {}) => new Promise((res) => {
  const i = ++id; pend.set(i, res);
  ws.send(JSON.stringify({ id: i, method: m, params: p }));
});
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); }
});
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
await send('Page.enable');

async function shot(name, w, h, scale, full = false) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: scale, mobile: w < 600 });
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/Blog/games/` });
  await new Promise((r) => setTimeout(r, 2800));
  const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: full });
  writeFileSync(`D:/cxdownload/yemian/scripts/games-${name}.png`, Buffer.from(data, 'base64'));
  console.log(name, 'saved');
}
await shot('desktop', 1280, 900, 1);
await shot('mobile', 390, 844, 2, true);

ws.close();
proc.kill();
server.close();
console.log('done');
