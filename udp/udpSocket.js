const EventEmitter = require('events').EventEmitter;
const dgram = require('dgram');
const Logger = require('@voliware/logger');

/**
 * Virtual UDP Socket
 */
class UdpSocket extends EventEmitter {

    /**
     * Constructor
     * @param {String} address
     * @param {Number} port
     * @param {Object} [options={}]
     * @param {String} [options.log_handle]
     * @return {UdpSocket} 
     */
    constructor({address = "localhost", port = 65000}){
        super();

        /**
         * Socket network address
         * @type {String}
         */
        this.address = address;

        /**
         * Socket network port
         * @type {Number}
         */
        this.port = port;

        /**
         * Node socket
         * @type {Socket}
         */
        this.socket = dgram.createSocket('udp4');

        /**
         * Logging object
         * @type {Logger}
         */
        this.logger = new Logger(this.constructor.name, {
            context: `${this.address}:${this.port}`,
            level: "debug"
        });
    }

    /**
     * Write to the socket
     * @param {*} data 
     */
    write(data){
        this.logger.info(`Sending msg to ${this.address}:${this.port}`);
        this.socket.send(data, 0, data.length, this.port, this.address, (err, bytes) => {
            if (err) throw err;
            // self.logger.debug(data);
        });
    }

    /**
     * Virtually receive data from the socket.
     * Emit the data event.
     * @param {Buffer} data - the raw data, which is a buffer
     * @param {Object} rinfo - connection info, should be the same
     */
    receive(data, rinfo){
        this.emit('data', data);
    }

    /**
     * Close the socket
     */
    close(){
        this.socket.close();
    }
}

module.exports = UdpSocket;