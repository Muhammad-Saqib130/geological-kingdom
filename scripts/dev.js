// Runs the API and the Vite dev server together with prefixed output.
// If either process exits, the other is stopped too. Ctrl+C stops both.
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const isWin = process.platform === 'win32';
const npm = isWin ? 'npm.cmd' : 'npm';

const apps = [
  { name: 'server', color: 35, args: ['run', 'dev', '--prefix', 'server'] },
  { name: 'client', color: 36, args: ['run', 'dev', '--prefix', 'client'] },
];

const width = Math.max(...apps.map((a) => a.name.length));
let exiting = false;

function pipe(stream, prefix, out) {
  let buffer = '';
  stream.on('data', (chunk) => {
    buffer += chunk;
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop();
    for (const line of lines) out.write(`${prefix} ${line}\n`);
  });
  stream.on('end', () => buffer && out.write(`${prefix} ${buffer}\n`));
}

const children = apps.map(({ name, color, args }) => {
  const prefix = `\x1b[${color}m[${name.padEnd(width)}]\x1b[0m`;
  const child = spawn(npm, args, {
    cwd: root,
    env: { ...process.env, FORCE_COLOR: '1' },
    shell: isWin,
    // Own process group, so the whole tree (npm -> sh -> node/vite) can be stopped together
    detached: !isWin,
  });
  pipe(child.stdout, prefix, process.stdout);
  pipe(child.stderr, prefix, process.stderr);
  child.on('exit', (code, signal) => {
    if (exiting) return;
    console.log(`${prefix} exited with ${signal ?? `code ${code}`}; stopping the rest`);
    stopAll(code ?? 1);
  });
  return child;
});

// npm does not forward signals to the script it runs, so signal the whole tree.
function killTree(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  try {
    if (isWin) spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F']);
    else process.kill(-child.pid, 'SIGTERM');
  } catch {
    // Already gone
  }
}

function stopAll(code = 0) {
  if (exiting) return;
  exiting = true;
  children.forEach(killTree);
  setTimeout(() => process.exit(code), 1000).unref();
}

process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));
process.on('SIGHUP', () => stopAll(0));
process.on('exit', () => children.forEach(killTree));
