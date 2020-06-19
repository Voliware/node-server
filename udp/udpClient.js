const Socket = require('net').Socket;
const Client = require('../client/client');

/**
 * UDP Client
 * @extends {Client}
 */
class UdpClient extends Client {

	/**
	 * Constructor
	 * @param {Socket} socket
	 * @param {Object} [options={}]
	 * @return {UdpClient}
	 */
    constructor(socket, {id = 0}) {
        super(socket, {id});
	}

    /**
     * Get the address of the socket,
     * such as 127.0.0.1, or localhost
     * @return {String}
     */
    getSocketAddress(){
		if(this.socket){
			return this.socket.remoteAddress;
		}
    }

    /**
     * Get the port of the socket,
     * probably between 1 to 65535
     * @return {String}
     */
    getSocketPort(){
		if(this.socket){
			return this.socket.remotePort;
		}
    }

	/**
	 * Attach handlers to the socket.
	 * @param {Socket} socket 
	 */
	attachSocketHandlers(socket){		
		socket.on('data', (data) => {
			this.processRxData(data);
		});
		socket.on('error', () => {
			this.logger.error("Socket error:");
			this.logger.error(error);
			this.emit('error', error);
			this.error_count++;
		});
		socket.on('timeout', () => {
			this.logger.warning("Socket has timed out");
			this.emit('timeout');
		});
		socket.on('end', () => {
			this.logger.info("Socket has ended");
			this.emit('disconnect');
		});
		socket.on('close', () => {
			this.logger.info("Socket has closed");
			this.emit('disconnect');
		});
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
	 */
	disconnect(){
	}

    /**
     * Virtually receive data from the socket.
     * @param {*} data 
     * @param {Object} rinfo - connection info, should be the same
     */
	socketReceive(data, rinfo){
		if(this.socket){
			this.socket.receive(data, rinfo);
		}
	}

	/**
	 * Convert to object
	 * @return {Object}
	 */
	serialize(){
		return {
			id : this.id
		}
	}
}

module.exports = UdpClient;