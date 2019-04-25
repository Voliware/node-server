const Socket = require('net').Socket;
const Client = require('../client/client');
const util = require('../util/util');
const isString = util.isString;

/**
 * UDP Client
 * @extends {Client}
 */
class UdpClient extends Client {

	/**
	 * Constructor
	 * @param {Socket} socket
	 * @param {object} [options={}]
	 * @return {UdpClient}
	 */
	constructor(socket, options={}){
        let defaults = {logHandle: "UdpClient"};
        super(socket, Object.extend(defaults, options));
		return this;
	}

    /**
     * Get the address of the socket,
     * such as 127.0.0.1, or localhost
     * @return {string}
     */
    getSocketAddress(){
		if(this.socket){
			return this.socket.remoteAddress;
		}
    }

    /**
     * Get the port of the socket,
     * probably between 1 to 65535
     * @return {string}
     */
    getSocketPort(){
		if(this.socket){
			return this.socket.remotePort;
		}
    }

	/**
	 * Attach handlers to the socket.
	 * @param {Socket} socket 
	 * @return {UdpClient}
	 */
	attachSocketHandlers(socket){		
		let self = this;
		socket.on('data', function(data){
			self.processRxData(data);
		});
		socket.on('error', function(){
			self.logger.error("Socket error:");
			self.logger.error(error);
			self.emit('error', error);
			self.errorCount++;
			if(self.errorCount >= self.maxErrorCount){
				self.emit('maxError');
			}
		});
		socket.on('timeout', function(){
			self.logger.warn("Socket has timed out");
			self.emit('timeout');
		});
		socket.on('end', function(){
			self.logger.warn("Socket has ended");
			self.emit('disconnect');
		});
		socket.on('close', function(){
			self.logger.warn("Socket has closed");
			self.emit('disconnect');
		});
		return this;
	}

	/**
	 * Write data to the socket.
	 * @param {*} data
	 * @return {*|Number|null} - returns null if it failed
	 */
	write(data){
		return this.socket.write(data);
	}

	/**
	 * Disconnect the client.
	 * Does nothing for UDP.
	 * @return {UdpClient}
	 */
	disconnect(){
		return this;
	}

    /**
     * Virtually receive data from the socket.
     * @param {*} data 
     * @param {object} rinfo - connection info, should be the same
     * @return {UdpSocket}
     */
	socketReceive(data, rinfo){
		if(this.socket){
			this.socket.receive(data, rinfo);
		}
		return this;
	}

	/**
	 * Convert to object
	 * @return {object}
	 */
	serialize(){
		return {
			id : this.id
		}
	}
}

module.exports = UdpClient;