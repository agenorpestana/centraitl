const fs = require('fs');
const path = require('path');

const hasDist = fs.existsSync(path.join(__dirname, 'dist', 'server.cjs'));

module.exports = {
  apps: [
    {
      name: 'central-itl',
      script: hasDist ? 'dist/server.cjs' : 'server.ts',
      interpreter: hasDist ? 'node' : 'tsx',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '800M',
      restart_delay: 4000,
      max_restarts: 20,
      min_uptime: '10s',
      kill_timeout: 5000,
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3000,
      },
    },
  ],
};
