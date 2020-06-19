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
	 * @param {Object} [options]
	 * @return {TcpServerListener}
	 */
	constructor(options){
		super(options);
	}

	/**
	 * Create a TCP server and listen
	 * for incoming connections.
	 */
	listen(){
		this.createTcpServer();
		this.logger.info(`Listening on ${this.host} port ${this.port}`);
	}

	/**
	 * Close the server listener
	 */
	close(){
		this.server.unref();
	}

	/**
	 * Create a TCP server and start listening.
	 * Create and emit a TcpClient via the connect event.
	 */
	createTcpServer(){
		this.logger.info(`TCP server started on ${this.host} on port ${this.port}`);
		this.server = net.createServer((socket) => {
			socket.setEncoding("utf8");
			let client = this.createClient(socket);
			this.emit('connect', client);
		}).listen(this.port);
	}

	/**
	 * Create a TcpClient.
	 * @param {Socket} socket 
	 * @return {TcpClient}
	 */
	createClient(socket){
		let id = `${socket.remoteAddress}:${socket.remotePort}`;
		return new TcpClient(socket, {id});
	}
}

module.exports = TcpServerListener;