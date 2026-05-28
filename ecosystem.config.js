// Ecosystem PM2 untuk Frontend V1
// Membaca konfigurasi dari .env.services di root directory

const fs = require('fs');
const path = require('path');

// Load environment variables from .env.services
function loadEnvServices() {
  const rootDir = path.join(__dirname, '..');
  const envPath = path.join(rootDir, '.env.services');
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    lines.forEach(line => {
      // Skip comments and empty lines
      if (line.trim().startsWith('#') || !line.trim()) return;
      
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        process.env[key] = value;
      }
    });
  }
}

// Load env
loadEnvServices();

module.exports = {
  apps: [
    {
      name: "frontend-v1",
      cwd: __dirname,
      script: "/bin/bash",
      args: "-c 'yarn start'",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: process.env.FRONTEND_V1_PORT || "3000",
        HOSTNAME: process.env.FRONTEND_V1_HOST || "0.0.0.0"
      },
      env_development: {
        NODE_ENV: "development",
        PORT: process.env.FRONTEND_V1_PORT || "3000",
        HOSTNAME: process.env.FRONTEND_V1_HOST || "0.0.0.0"
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      time: true
    }
  ]
};
