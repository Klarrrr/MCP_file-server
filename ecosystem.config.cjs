// pm2 config. Start with: pm2 start ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: "mcp-files",
      script: "dist/index.js",
      cwd: __dirname,
      autorestart: true,
      max_restarts: 20,
      restart_delay: 2000,
    },
    // Optional: keep the ngrok tunnel alive too. Replace YOUR-DOMAIN.
    // {
    //   name: "tunnel",
    //   script: "ngrok",
    //   args: "http --domain=YOUR-DOMAIN.ngrok-free.app 3000",
    //   interpreter: "none",
    // },
  ],
};
