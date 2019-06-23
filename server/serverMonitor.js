class ServerMonitor {
    constructor(){
        this.startTime = 0;
        this.stopTime = 0;
        this.upTime = 0;
        return this;
    }

    getUpTime(){
        if(this.upTime){
            return this.upTime;
        }
        if(this.startTime){
            return this.startTime - Date.now();
        }
        return 0;
    }

    start(){
        this.stopTime = 0;
        this.startTime = Date.now();
        return this;
    }

    stop(){
        this.stopTime = Date.now();
        this.upTime = this.stopTime - this.startTime;
        return this;
    }
}

module.exports = ServerMonitor;