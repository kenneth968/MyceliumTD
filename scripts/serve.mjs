import { createReadStream, stat } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const publicDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const rawPort = process.env.PORT ?? '8080';
const port = Number(rawPort);

if (!/^\d+$/.test(rawPort) || !Number.isInteger(port) || port < 0 || port > 65535) {
  throw new Error('PORT must be an integer from 0 through 65535.');
}

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

function sendStatus(response, statusCode) {
  response.writeHead(statusCode);
  response.end();
}

function getFilePath(requestUrl) {
  try {
    const pathname = decodeURIComponent(new URL(requestUrl, 'http://127.0.0.1').pathname);
    const relativePath = pathname === '/' ? 'index.html' : pathname.slice(1);
    const filePath = resolve(publicDirectory, relativePath);
    return filePath === publicDirectory || filePath.startsWith(`${publicDirectory}${sep}`) ? filePath : null;
  } catch {
    return undefined;
  }
}

const server = createServer((request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.setHeader('Allow', 'GET, HEAD');
    sendStatus(response, 405);
    return;
  }

  const filePath = getFilePath(request.url ?? '/');
  if (filePath === undefined) {
    sendStatus(response, 400);
    return;
  }
  if (filePath === null) {
    sendStatus(response, 403);
    return;
  }

  stat(filePath, (error, details) => {
    if (error !== null || !details.isFile()) {
      sendStatus(response, 404);
      return;
    }

    response.writeHead(200, {
      'Content-Length': details.size,
      'Content-Type': contentTypes[extname(filePath)] ?? 'application/octet-stream',
    });
    if (request.method === 'HEAD') {
      response.end();
      return;
    }
    createReadStream(filePath).on('error', () => sendStatus(response, 500)).pipe(response);
  });
});

server.listen(port, '127.0.0.1', () => {
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('Unable to determine local server address.');
  console.log(`SERVER_URL=http://127.0.0.1:${address.port}`);
});

process.on('SIGTERM', () => server.close());
