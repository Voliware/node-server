const microtime = require('microtime');

/**
 * Generates a unique id based on the timestamp,
 * a prefix, and an internal counter.
 */
class IdGenerator {

    /**
     * Constructor
     * @param {string} [prefix=""] - the id prefix
     * @return {IdGenerator}
     */
    constructor(prefix = ""){
        this.prefix = prefix;
        this.counter = 0;
        this.lastTime = 0;
        return this;
    }

    /**
     * Generates a unique id based on the timestamp,
     * a prefix, and an internal counter.
     * @return {string}
     */
    generateId(){
        let now = microtime.now();
        // if an ID is being generated with the same timestamp as the
        // last request to generate an ID, then increment the counter 
        if(this.lastTime === now){
            this.counter++;
        }
        else {
            this.counter = 0;
        }
        this.lastTime = now;
        return `${this.prefix}${now}${this.counter}`;
    }
}

module.exports = IdGenerator;