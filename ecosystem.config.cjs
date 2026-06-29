module.exports = {
  apps: [
    {
      name: "church-pwa",
      script: "node_modules/next/dist/bin/next",
      args: "dev -p 3000 -H 0.0.0.0",
      cwd: "/home/user/webapp",
      env: {
        NODE_ENV: "development",
        PORT: 3000,
      },
      watch: false,
      instances: 1,
      exec_mode: "fork",
    },
  ],
};
