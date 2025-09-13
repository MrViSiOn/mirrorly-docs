module.exports = {
  apps: [{
    name: 'mirrorly-api',
    script: './dist/app.js',
    instances: process.env.NODE_ENV === 'production' ? 'max' : 1,
    exec_mode: 'cluster',

    // Environment configurations
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      // Production optimizations
      UV_THREADPOOL_SIZE: 128,
      NODE_OPTIONS: '--max-old-space-size=2048'
    },
    env_staging: {
      NODE_ENV: 'staging',
      PORT: 3000
    },

    // Logging configuration
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    time: true,

    // Memory and performance settings
    max_memory_restart: '2G',
    node_args: '--max_old_space_size=2048',

    // Restart policies
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s',

    // Monitoring and health checks
    pmx: true,

    // Graceful shutdown
    kill_timeout: 5000,
    listen_timeout: 3000,

    // File watching (development only)
    watch: process.env.NODE_ENV !== 'production',
    ignore_watch: ['node_modules', 'logs', 'uploads', 'temp', 'dist'],

    // Cron restart (daily at 3 AM in production)
    cron_restart: process.env.NODE_ENV === 'production' ? '0 3 * * *' : undefined,

    // Auto restart on crashes
    autorestart: true,

    // Source map support for better error traces
    source_map_support: true
  }]
};