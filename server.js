// Minimal HTTP server that logs every incoming request with its source IP.
// Run: node server.js   (PORT env var optional, default 3000)
// Set TRUST_PROXY=1 only if behind a reverse proxy you control (nginx, ALB, ...),
// so the client IP is taken from X-Forwarded-For instead of the socket.
const http = require('http');
const fs = require('fs');

const PORT = process.env.PORT || 3000;
const TRUST_PROXY = process.env.TRUST_PROXY === '1';
const LOG_FILE = process.env.LOG_FILE || 'requests.log';

function clientIp(req) {
  if (TRUST_PROXY) {
    const xff = req.headers['x-forwarded-for'];
    if (xff) return xff.split(',')[0].trim();
  }
  // Strip the IPv4-mapped IPv6 prefix (::ffff:1.2.3.4 -> 1.2.3.4)
  return (req.socket.remoteAddress || '').replace(/^::ffff:/, '');
}

const out = fs.createWriteStream(LOG_FILE, { flags: 'a' });

const server = http.createServer((req, res) => {
  const entry = {
    time: new Date().toISOString(),
    ip: clientIp(req),
    port: req.socket.remotePort,
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
