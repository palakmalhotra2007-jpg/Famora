const { spawn } = require('child_process');
const path = require('path');

const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

console.log('🚀 Starting Famora (Supabase — no backend needed)...\n');

const clientDir = path.join(__dirname, 'src', 'client');

const client = spawn(npmCmd, ['run', 'dev'], {
  cwd: clientDir,
  stdio: 'inherit',
  shell: true,
});

client.on('error', (err) => {
  console.error('Failed to start client:', err.message);
  process.exit(1);
});

function cleanup() {
  if (client && !client.killed) client.kill();
  process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);
