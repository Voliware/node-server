const readline = require('readline');
const EventEmitter = require('events');

/**
 * Console input 
 * @extends EventEmitter
 */
class ConsoleInput extends EventEmitter {

    /**
     * Constructor
     * @return {ConsoleInput}
     */
    constructor(){
        super();
        this.readLine = readline.createInterface({
            input: process.stdin,
            output: null // cool this doesnt work
        });
        let self = this;
        this.readLine.on('line', function(line){
            // console.log("-> " + line);
            self.emit('line', line);
        });
        return this;
    }
}

module.exports = ConsoleInput;