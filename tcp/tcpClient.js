const Socket = require('net').Socket;
const Client = require('./../client/client');
const BufferJsonMessage = require('./../buffer/bufferJsonMessage');

/**
 * TCP Client
 * @extends {Client}
 */
class TcpClient extends Client {

	/**
	 * Constructor
	 * @param {Socket} socket
	 * @param {Object} [options={}]
	 * @return {TcpClient}
	 */
	constructor(socket, {id = 0, message_type = BufferJsonMessage}) {
        super(socket, {id, message_type});
		return this;
	}

	/**
	 * Get the address of the socket,
	 * such as 127.0.0.1, or localhost
	 * @return {String}
	 */
	getSocketAddress() {
		if (this.socket) {
			return this.socket.remoteAddress;
		}
	}

	/**
	 * Get the port of the socket,
	 * probably between 1 to 65535
	 * @return {String}
	 */
	getSocketPort() {
		if (this.socket) {
			return this.socket.remotePort;
		}
	}

	/**
	 * Attach handlers to the socket.
	 * @param {Socket} socket 
	 * @return {TcpClient}
	 */ 
	attachSocketHandlers(socket) {
		socket.on('data', (data) => {
			this.processRxData(data);
		});
		socket.on('error', (error) => {
			this.logger.error("Socket error:");
			this.logger.error(error);
			this.emit('error', error);
			this.error_count++;
		});
		socket.on('timeout', () => {
			this.logger.warning("Socket has timed out");
			this.emit('timeout');
		});
		// FIN packet
		socket.on('end', () => {
			this.logger.info("Socket has ended");
			this.emit('disconnect');
		});
		// fully closed
		socket.on('close', () => {
			this.logger.info("Socket has closed");
			this.emit('disconnect');
		});
		return this;
	}

    /**
     * Disconnect the client.
     * @return {TcpClient}
     */
    disconnect(){
		this.socket.end();
		// may need to call destroy?
		return this;
    }

	/**
	 * Write data to the socket.
	 * @param {*} data
	 * @return {*|Number|null} - returns null if it failed
	 */
	write(data) {
		return this.socket.write(data);
	}

	/**
	 * Convert to object
	 * @return {Object}
	 */
	serialize() {
		return {
			id: this.id
		}
	}
}

module.exports = TcpClient;