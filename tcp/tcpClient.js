const Socket = require('net').Socket;
const Client = require('./../client/client');

/**
 * TCP Client
 * @extends {Client}
 */
class TcpClient extends Client {

	/**
	 * Constructor
	 * @param {Socket} socket
	 * @param {object} [options={}]
	 * @return {TcpClient}
	 */
	constructor(socket, options = {}) {
		let defaults = {logHandle: "TcpClient"};
		super(socket, Object.extend(defaults, options));
		return this;
	}

	/**
	 * Get the address of the socket,
	 * such as 127.0.0.1, or localhost
	 * @return {string}
	 */
	getSocketAddress() {
		if (this.socket) {
			return this.socket.remoteAddress;
		}
	}

	/**
	 * Get the port of the socket,
	 * probably between 1 to 65535
	 * @return {string}
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
		let self = this;
		socket.on('data', function (data) {
			self.processRxData(data);
		});
		socket.on('error', function (error) {
			self.logger.error("Socket error:");
			self.logger.error(error);
			self.emit('error', error);
			self.errorCount++;
			if (self.errorCount >= self.maxErrorCount) {
                self.logger.error("Socket reached max errors");
				self.emit('maxError');
			}
		});
		socket.on('timeout', function () {
			self.logger.warning("Socket has timed out");
			self.emit('timeout');
		});
		// FIN packet
		socket.on('end', function () {
			self.logger.info("Socket has ended");
			self.emit('disconnect');
		});
		// fully closed
		socket.on('close', function () {
			self.logger.info("Socket has closed");
			self.emit('disconnect');
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
	 * @return {object}
	 */
	serialize() {
		return {
			id: this.id
		}
	}
}

module.exports = TcpClient;