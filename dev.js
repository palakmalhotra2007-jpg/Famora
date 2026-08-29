const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

console.log('🚀 Starting Famora Backend & Frontend concurrently...\n');

const backendDir = fs.existsSync(path.join(__dirname, 'backend'))
  ? path.join(__dirname, 'backend')
  : path.join(__dirname, 'Famora', 'backend');

const frontendDir = fs.existsSync(path.join(__dirname, 'frontend'))
  ? path.join(__dirname, 'frontend')
  : path.join(__dirname, 'Famora', 'frontend');

const backend = spawn(npmCmd, ['run', 'dev'], {
  cwd: backendDir,
  stdio: 'inherit',
  shell: true,
});

const frontend = spawn(npmCmd, ['run', 'dev'], {
  cwd: frontendDir,
  stdio: 'inherit',
  shell: true,
});

function cleanup() {
  if (backend && !backend.killed) backend.kill();
  if (frontend && !frontend.killed) frontend.kill();
  process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);
