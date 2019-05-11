const dgram = require('dgram');
const ServerListener = require ('../server/serverListener');
const UdpClient = require('./udpClient');
const UdpSocket = require('./udpSocket');
const ClientManager = require('./../client/clientManager');

/**
 * UDP ServerListener
 * @extends {ServerListener}
 */
class UdpServerListener extends ServerListener {

	/**
	 * Constructor
	 * @param {object} [options]
	 * @return {UdpServerListener}
	 */
	constructor(options){
        let defaults = {name: "UdpServerListener"};
		super(Object.extend(defaults, options));
		// we need a client manager to track unique clients
		// otherwise we would be creating a new UdpClient
		// on every single message
		this.clientManager = new ClientManager();
		return this;
	}

	/**
	 * Set the ClientManager.
	 * @param {ClientManager} clientManager 
	 * @return {UdpServerListener}
	 */
	setClientManager(clientManager){
		this.clientManager = clientManager;
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
		let self = this;
		this.server = dgram.createSocket('udp4');
		this.server.on('listening', function(){
			let addr = this.address();
			self.logger.info(`Listening on ${addr.address} port ${addr.port}`);
		});
		this.server.on('message', function(message, rinfo){
			let clientName = `${rinfo.address}:${rinfo.port}`;
			// if the client exists, pipe msg to client
			let client = self.clientManager.getClient(clientName);
			if(client){
				client.socketReceive(message, rinfo);
			}
			// new client
			else {
				client = self.createClient(rinfo);
				self.emit('connect', client);
				client.socketReceive(message, rinfo);
			}
		});
		this.server.on('error', function(error){
			self.logger.error("Server error:");
			self.logger.error(error);
		});

		this.logger.info(`UDP server started on ${this.host} on port ${this.port}`);
		this.server.bind(this.port, this.host);
		return this;
	}

	/**
	 * Create a UdpClient.
	 * @param {object} socket 
     * @param {object} [options]
	 * @param {object} [connectData] 
	 * @return {UdpClient}
	 */
	createClient(socket, options = this.clientOptions, connectData){
		let id = `${socket.address}:${socket.port}`;
		let defaults = {
			name: "UdpClient"+id,
			id: id,
			logHandle: this.logger.handle
		};
		Object.extend(defaults, options);
		let udpSocket = new UdpSocket(socket.address, socket.port, {
			logHandle: "UdpClient"+id
		});
		return new UdpClient(udpSocket, defaults);
	}
}

module.exports = UdpServerListener;