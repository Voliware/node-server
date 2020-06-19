/**
 * Server statistics
 */
class ServerMonitor {

    /**
     * Constructor
     * @return {ServerMonitor}
     */
    constructor(){
        this.time = {
            start: 0,
            stop: 0,
            up: 0
        }
    }

    /**
     * Get the current server uptime
     * @return how long the server has been up in seconds
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
     */
    start(){
        this.time.up = 0;
        this.time.stop = 0;
        this.time.start = Date.now();
    }

    /**
     * Stop the monitor.
     * Record total uptime.
     */
    stop(){
        this.time.stop = Date.now();
        this.time.up = this.time.stop - this.time.start;
    }
}

module.exports = ServerMonitor;