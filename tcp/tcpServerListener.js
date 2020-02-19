const net = require('net');
const ServerListener = require ('../server/serverListener');
const TcpClient = require('./tcpClient');

/**
 * TCP ServerListener
 * @extends {ServerListener}
 */
class TcpServerListener extends ServerListener {

	/**
	 * Constructor
	 * @param {object} [options]
	 * @return {TcpServerListener}
	 */
	constructor(options){
        let defaults = {name: "TcpServerListener"};
		super(Object.extend(defaults, options));
		return this;
	}

	/**
	 * Create a TCP server and listen
	 * for incoming connections.
	 * @return {TcpServerListener}
	 */
	listen(){
		this.createTcpServer();
		this.logger.info(`Listening on ${this.host} port ${this.port}`);
		return this;
	}

	/**
	 * Close the server listener
	 * @return {TcpServerListener}
	 */
	close(){
		this.server.unref();
		return this;
	}

	/**
	 * Create a TCP server and start listening.
	 * Create and emit a TcpClient via the connect event.
	 * @return {TcpServerListener}
	 */
	createTcpServer(){
		this.logger.info(`TCP server started on ${this.host} on port ${this.port}`);
		this.server = net.createServer((socket) => {
			socket.setEncoding("utf8");
			let client = this.createClient(socket);
			this.emit('connect', client);
		}).listen(this.port);
		return this;
	}

	/**
	 * Create a TcpClient.
	 * @param {Socket} socket 
     * @param {object} [options]
     * @param {string} [options.logHandle]
	 * @param {object} [connectData] 
	 * @return {TcpClient}
	 */
	createClient(socket, options = this.clientOptions, connectData){
		let id = `${socket.remoteAddress}:${socket.remotePort}`;
		let defaults = {
			name: "TcpClient@"+id,
			id: id,
			logHandle: this.logger.handle
		};
		let opts = Object.extend(this.clientOptions, defaults, options);
		return new TcpClient(socket, opts);
	}
}

module.exports = TcpServerListener;