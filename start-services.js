#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Starting both services...\n');

// Start email server
const emailServer = spawn('node', ['email-server.js'], {
  cwd: __dirname,
  stdio: 'inherit'
});

// Start mongo server
const mongoServer = spawn('node', ['mongo-server.js'], {
  cwd: __dirname,
  stdio: 'inherit'
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down services...');
  emailServer.kill('SIGINT');
  mongoServer.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down services...');
  emailServer.kill('SIGTERM');
  mongoServer.kill('SIGTERM');
  process.exit(0);
});

// Handle child process exits
emailServer.on('exit', (code) => {
  console.log(`📧 Email server exited with code ${code}`);
  if (code !== 0) {
    mongoServer.kill();
    process.exit(code);
  }
});

mongoServer.on('exit', (code) => {
  console.log(`🗄️  MongoDB server exited with code ${code}`);
  if (code !== 0) {
    emailServer.kill();
    process.exit(code);
  }
});

console.log('✅ Both services started successfully!');
console.log('📧 Email server: http://localhost:3001');
console.log('🗄️  MongoDB server: http://localhost:3002');
console.log('\nPress Ctrl+C to stop both services\n');
