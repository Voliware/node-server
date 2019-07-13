const EventEmitter = require('events').EventEmitter;
const dgram = require('dgram');
const Logger = require('@voliware/logger');

/**
 * Virtual UDP Socket
 */
class UdpSocket extends EventEmitter {

    /**
     * Constructor
     * @param {string} address
     * @param {number} port
     * @param {object} [options={}]
     * @param {string} [options.logHandle]
     * @return {UdpSocket} 
     */
    constructor(address, port, options = {}){
        super();
        this.address = address;
        this.port = port;
        this.socket = dgram.createSocket('udp4');
        this.logger = new Logger(options.logHandle || "UdpSocket", this);
        return this;
    }

    /**
     * Write to the socket
     * @param {*} data 
     * @return {UdpSocket}
     */
    write(data){
        let self = this;
        this.socket.send(data, 0, data.length, this.port, this.address, function(err, bytes) {
            if (err) throw err;
            self.logger.info('Sending msg to ' + self.address +':'+ self.port);
            self.logger.debug(data);
        });
        return this;
    }

    /**
     * Virtually receive data from the socket.
     * Emit the data event.
     * @param {Buffer} data - the raw data, which is a buffer
     * @param {object} rinfo - connection info, should be the same
     * @return {UdpSocket}
     */
    receive(data, rinfo){
        this.emit('data', data);
        return this;
    }

    /**
     * Close the socket
     * @return {UdpSocket}
     */
    close(){
        this.socket.close();
        return this;        
    }
}

module.exports = UdpSocket;