// Tiny static + mock-API server for the example app. Started by cypress.config
// so `cypress run` needs no separate process. Serves the SPA shell for every
// page route and a handful of JSON endpoints the app calls.
const http = require('http');
const fs = require('fs');
const path = require('path');

const APP_DIR = path.join(__dirname, 'app');

function send(res, status, body, type = 'application/json') {
  res.writeHead(status, {
    'Content-Type': type,
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function serveFile(res, file, type) {
  fs.readFile(file, (err, data) => {
    if (err) return send(res, 404, 'Not found', 'text/plain');
    send(res, 200, data, type);
  });
}

const PRODUCTS = Array.from({ length: 5 }, (_, i) => ({
  id: i + 1,
  name: `Product ${i + 1}`,
}));

function createServer() {
  return http.createServer((req, res) => {
    const url = (req.url || '/').split('?')[0];

    // --- Mock API ---
    if (url === '/api/dashboard') {
      return send(res, 200, JSON.stringify({ sales: 42, users: 1337 }));
    }
    if (url === '/api/products') {
      return send(res, 200, JSON.stringify({ products: PRODUCTS }));
    }
    if (url === '/api/orders' && req.method === 'POST') {
      return send(res, 201, JSON.stringify({ ok: true, id: 'order-1' }));
    }

    // --- Static assets ---
    if (url === '/app.js') {
      return serveFile(res, path.join(APP_DIR, 'app.js'), 'text/javascript');
    }
    if (url === '/styles.css') {
      return serveFile(res, path.join(APP_DIR, 'styles.css'), 'text/css');
    }

    // --- SPA shell for every page route ---
    return serveFile(res, path.join(APP_DIR, 'index.html'), 'text/html');
  });
}

/** Start the server on an ephemeral port; resolves with the base URL. */
function start() {
  return new Promise((resolve) => {
    const server = createServer();
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

module.exports = { start };
