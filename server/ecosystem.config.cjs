module.exports = {
    apps: [{
        name: 'cherry-star',
        script: './dist/index.js',
        cwd: '/opt/cherry-star/server',
        instances: 3,
        exec_mode: 'cluster',
        env: {
            NODE_ENV: 'production',
        },
        // Restart policy
        max_memory_restart: '500M',
        restart_delay: 3000,
        max_restarts: 10,
        // Logging
        log_date_format: 'YYYY-MM-DD HH:mm:ss',
        error_file: '/opt/cherry-star/logs/error.log',
        out_file: '/opt/cherry-star/logs/out.log',
        merge_logs: true,
        // Graceful
        kill_timeout: 5000,
        listen_timeout: 10000,
    }],
};
