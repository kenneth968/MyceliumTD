import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { strict as assert } from 'node:assert';
import { resolve } from 'node:path';

const PROJECT_ROOT = resolve(__dirname, '..');
const command = process.platform === 'win32' ? (process.env.ComSpec ?? 'cmd.exe') : 'npm';
const commandArguments = process.platform === 'win32' ? ['/d', '/s', '/c', 'npm run serve'] : ['run', 'serve'];
const musicPaths = [
  '/assets/music/the-chantarelle.mp3',
  '/assets/music/the-lions-mane-1.mp3',
  '/assets/music/the-lions-mane-2.mp3',
];

function waitForServerUrl(server: ChildProcessWithoutNullStreams): Promise<string> {
  return new Promise((resolveUrl, reject) => {
    let output = '';
    const timeout = setTimeout(() => reject(new Error(`Timed out waiting for local server:\n${output}`)), 5000);
    const finish = (callback: () => void) => {
      clearTimeout(timeout);
      server.stdout.off('data', onData);
      server.stderr.off('data', onData);
      server.off('error', onError);
      server.off('exit', onExit);
      callback();
    };
    const onData = (chunk: Buffer) => {
      output += chunk.toString();
      const match = output.match(/SERVER_URL=(http:\/\/127\.0\.0\.1:\d+)/);
      if (match?.[1]) finish(() => resolveUrl(match[1]));
    };
    const onError = (error: Error) => finish(() => reject(error));
    const onExit = (code: number | null, signal: NodeJS.Signals | null) => {
      finish(() => reject(new Error(`Local server exited before listening (code ${String(code)}, signal ${String(signal)}):\n${output}`)));
    };
    server.stdout.on('data', onData);
    server.stderr.on('data', onData);
    server.once('error', onError);
    server.once('exit', onExit);
  });
}

async function assertLoads(baseUrl: string, path: string): Promise<Response> {
  const response = await fetch(`${baseUrl}${path}`, { signal: AbortSignal.timeout(2000) });
  assert.equal(response.status, 200, `${path} should load from the local play root`);
  return response;
}

function stopServer(server: ChildProcessWithoutNullStreams): void {
  if (server.exitCode !== null || server.pid === undefined) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill.exe', ['/pid', String(server.pid), '/t', '/f'], { stdio: 'ignore' });
  } else {
    process.kill(-server.pid, 'SIGTERM');
  }
}

async function main(): Promise<void> {
  const server = spawn(command, commandArguments, {
    cwd: PROJECT_ROOT,
    detached: process.platform !== 'win32',
    env: { ...process.env, PORT: '0' },
    stdio: 'pipe',
  });

  try {
    const baseUrl = await waitForServerUrl(server);
    const index = await assertLoads(baseUrl, '/');
    assert.match(await index.text(), /id="gameCanvas"/, 'the local play root should serve the game page');
    await assertLoads(baseUrl, '/bundle.js');
    for (const musicPath of musicPaths) await assertLoads(baseUrl, musicPath);
    console.log('local play smoke test passed');
  } finally {
    stopServer(server);
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
