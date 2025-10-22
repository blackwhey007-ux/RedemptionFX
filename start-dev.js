const { spawn } = require('child_process');
const path = require('path');

console.log('🔥 Starting RedemptionFX Development Server...\n');

// Start Next.js development server
const nextDev = spawn('npx', ['next', 'dev', '--port', '3000'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

nextDev.on('error', (err) => {
  console.error('❌ Failed to start development server:', err);
});

nextDev.on('close', (code) => {
  console.log(`\n🛑 Development server exited with code ${code}`);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down development server...');
  nextDev.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down development server...');
  nextDev.kill('SIGTERM');
  process.exit(0);
});
