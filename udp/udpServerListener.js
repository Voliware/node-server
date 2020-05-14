const dgram = require('dgram');
const ServerListener = require ('../server/serverListener');
const UdpClient = require('./udpClient');
const UdpSocket = require('./udpSocket');

/**
 * UDP ServerListener
 * @extends {ServerListener}
 */
class UdpServerListener extends ServerListener {

	/**
	 * Constructor
	 * @param {Object} [options]
	 * @return {UdpServerListener}
	 */
	constructor(options){
		super(options);
		return this;
	}

	/**
	 * Create a UDP server and listen
	 * for incoming connections.
	 * @return {UdpServerListener}
	 */
	listen(){
		this.createUdpServer();
		return this;
	}

	/**
	 * Close the server listener.
	 * Does nothing for UDP.
	 * @return {UdpServerListener}
	 */
	close(){
		return this;
	}

	/**
	 * Create a UDP server and start listening.
	 * Create and emit a UdpClient via the connect event.
	 * @return {UdpServerListener}
	 */
	createUdpServer(){
        this.server = dgram.createSocket('udp4');
		this.server.on('listening', () => {
			let addr = this.server.address();
			this.logger.info(`Listening on ${addr.address} port ${addr.port}`);
		});
		this.server.on('message', (message, rinfo) => {
			let client_name = `${rinfo.address}:${rinfo.port}`;
			// if the client exists, pipe msg to client
			let client = this.client_manager.get(client_name);
			if(client){
				client.socketReceive(message, rinfo);
			}
			// new client
			else {
				client = this.createClient(rinfo);
				this.emit('connect', client);
				client.socketReceive(message, rinfo);
			}
		});
		this.server.on('error', (error) => {
			this.logger.error("Server error:");
			this.logger.error(error);
		});

		this.logger.info(`UDP server started on ${this.host} on port ${this.port}`);
		this.server.bind(this.port, this.host);
		return this;
	}

	/**
	 * Create a UdpClient.
	 * @param {Object} socket 
     * @param {Object} [options]
	 * @param {Object} [connectData] 
	 * @return {UdpClient}
	 */
	createClient(socket, options, connectData){
		let id = `${socket.address}:${socket.port}`;
		let udp_socket = new UdpSocket({
            address: socket.address,
            port: socket.port
		});
		return new UdpClient(udp_socket, {id});
	}
}

module.exports = UdpServerListener;