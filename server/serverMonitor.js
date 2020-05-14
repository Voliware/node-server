/**
 * Server statistics
 */
class ServerMonitor {

    /**
     * Constructor
     * @returns {ServerMonitor}
     */
    constructor(){
        this.time = {
            start: 0,
            stop: 0,
            up: 0
        }
        return this;
    }

    /**
     * Get the current server uptime
     * @returns how long the server has been up in seconds
     */
    getUpTime(){
        if(this.time.up){
            return this.time.up;
        }
        if(this.time.start){
            return this.time.start - Date.now();
        }
        return 0;
    }

    /**
     * Start the monitor.
     * Reset all time stats.
     * @returns {ServerMonitor}
     */
    start(){
        this.time.up = 0;
        this.time.stop = 0;
        this.time.start = Date.now();
        return this;
    }

    /**
     * Stop the monitor.
     * Record total uptime.
     * @returns {ServerMonitor}
     */
    stop(){
        this.time.stop = Date.now();
        this.time.up = this.time.stop - this.time.start;
        return this;
    }
}

module.exports = ServerMonitor;