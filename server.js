// Minimal HTTP server that logs every incoming request with its source IP.
// Run: node server.js   (PORT env var optional, default 3000)
// Behind a proxy (Render, nginx, ...) the socket IP is the proxy's, so the client IP
// is read from forwarding headers. socketIp and forwardedFor are logged for debugging.
const http = require('http');
const fs = require('fs');

const PORT = process.env.PORT || 3000;
// On by default because hosts like Render always sit behind a proxy; set TRUST_PROXY=0 to disable.
const TRUST_PROXY = process.env.TRUST_PROXY !== '0';
const LOG_FILE = process.env.LOG_FILE || 'requests.log';

function clientIp(req) {
  if (TRUST_PROXY) {
    const h = req.headers;
    const fwd = h['cf-connecting-ip'] || h['true-client-ip'] || h['x-real-ip'] ||
      (h['x-forwarded-for'] || '').split(',')[0].trim();
    if (fwd) return fwd;
  }
  // Strip the IPv4-mapped IPv6 prefix (::ffff:1.2.3.4 -> 1.2.3.4)
  return (req.socket.remoteAddress || '').replace(/^::ffff:/, '');
}

const out = fs.createWriteStream(LOG_FILE, { flags: 'a' });

const server = http.createServer((req, res) => {
  const entry = {
    time: new Date().toISOString(),
    ip: clientIp(req),
    socketIp: (req.socket.remoteAddress || '').replace(/^::ffff:/, ''),
    forwardedFor: req.headers['x-forwarded-for'],
    method: req.method,
    url: req.url,
    host: req.headers.host,
    userAgent: req.headers['user-agent'],
  };
  const line = JSON.stringify(entry);
  console.log(line);
  out.write(line + '\n');

  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('ok\n');
});

server.listen(PORT, '0.0.0.0', () => console.log(`Listening on :${PORT}, logging to ${LOG_FILE}`));
