const fs = require('fs');
const http = require('http');
const https = require('https');
const ServerListener = require('../server/serverListener');
const WebSocketServer = require('ws').Server;
const WebSocketClient = require('./webSocketClient');

/**
 * WebSocket based ServerListener.
 * This creates an HTTP/S server which is passed into a WebSocketServer.
 * The WebSocketServer will emit connection events.
 * On a connection, WebSocketServerListener will emit a 
 * "connect" event with a WebSocketClientSocket. 
 * @extends {ServerListener}
 */
class WebSocketServerListener extends ServerListener {

	/**
	 * Constructor
	 * @param {object} [options]
	 * @param {string} [options.host='localhost']
	 * @param {number} [options.port=80]
	 * @param {boolean} [options.https=false]
	 * @param {string} [options.certificatePath='sslcert/server.cert']
	 * @param {string} [options.privateKeyPath='sslcert/server.key']
	 * @param {string} [options.logHandle]
	 * @return {WebSocketServerListener}
	 */
	constructor(options = {}){
		let defaults = {
			host: 'localhost',
			port: 80,
			https: false,
			certificatePath: 'sslcert/server.cert',
			privateKeyPath: 'sslcert/server.key',
			logHandle: 'WebSocketServerListener'
		};
		super(Object.extend(defaults, options));

		// properties
		this.https = defaults.https;
		this.certificate = null;
		this.privateKey = null;
		this.certificatePath = defaults.certificatePath;
		this.privateKeyPath = defaults.privateKeyPath;

		// set certs
		if(typeof this.certificatePath === "string"){
			this.setSslCertificateFromFile(this.certificatePath);
		}
		if(typeof this.privateKeyPath === "string"){
			this.setSslPrivateKeyFromFile(this.privateKeyPath);
		}

		return this;
	}

	/**
	 * Start an HTTP/S server and a WebSocket server.
	 * Begin listening on the WebSocket server.
	 * @param {object} [options]
	 * @return {WebSocketServerListener}
	 */
	listen(options){
		if(this.https === true){
			this.server = this.createHttpsServer(null);
		}
		else {
			this.server = this.createHttpServer(null);
		}
		this.webSocketServer = this.createWebSocketServer(this.server);

		this.attachHttpServerHandlers();
		this.attachWebSocketServerHandlers();
		this.logger.info(`Listening on ${this.host} port ${this.port}`);
		return this;
	}

	/**
	 * Close the server listener.
	 * @return {WebSocketServerListener}
	 */
	close(){
		this.webSocketServer.close();
		return this;
	}

	/**
	 * Set SSL cerficiate a provided path or from
	 * the path setting that was passed in the constructor.
	 * @param {string} path
	 * @return {WebSocketServerListener}
	 */
	setSslCertificateFromFile(path){
		this.certificate = fs.readFileSync(path, 'utf8');
		return this;
	}

	/**
	 * Set SSL cerficiate a provided path or from
	 * the path setting that was passed in the constructor.
	 * @param {string} path
	 * @return {WebSocketServerListener}
	 */
	setSslPrivateKeyFromFile(path){
		this.privateKey = fs.readFileSync(path, 'utf8');
		return this;
	}

	/**
	 * Create an HTTP server.
	 * @param {object} listener
	 * @return {Server}
	 */
	createHttpServer(listener){
		let server = http.createServer(listener);
		server.listen({
			host: this.host,
			port: this.port
		});
        this.logger.info(`HTTP server started on ${this.host} on port ${this.port}`);
		return server;
	}

	/**
	 * Create an HTTPS server.
	 * Requires that keys are set.
	 * @param {object} listener
	 * @return {WebSocketServerListener}
	 */
	createHttpsServer(listener){
		let server = https.createServer({key: this.privateKey, cert: this.certificate}, listener);
		server.listen({
			host: this.host,
			port: this.port
		});
        this.logger.info(`HTTPS server started on ${this.host} on port ${this.port}`);
		return server;
	}

	/**
	 * Attach handlers to the HTTP server
	 * @return {WebSocketServerListener}
	 */
	attachHttpServerHandlers(){
		let self = this;
		this.server.on('error', function(error){
			self.logger.error(error);
		});
		return this;
	}

	/**
	 * Create a websocket server
	 * @param {object} server - an http/s server
	 * @return {WebSocketServer}
	 */
	createWebSocketServer(server){
		return new WebSocketServer({server});
	}

	/**
	 * Attach handlers to the web socket server.
	 * Create and emit a WebSocketClient via the connect event.
	 * @return {WebSocketServerListener}
	 */
	attachWebSocketServerHandlers(){
		let self = this;
		this.webSocketServer.on('connection', function(socket, req) {
			self.logger.info('WebSocket connected');
			let client = self.createClient(socket);
			self.emit('connect', client, req);
			// on close, emit disconnect
			// note: this listens on the main socket, not the socket wrapper.. 
			socket.on('close', function(code, reason){
				self.logger.debug(`WebSocket closed with code: ${code}, reason: ${reason ? reason : "none"}`);
				self.emit('disconnect', {code, reason});
			});
		});
		return this;
	}

	/**
	 * Create a WebSocketClient.
	 * @param {WebSocket} socket 
     * @param {object} [options]
     * @param {string} [options.logHandle]
	 * @param {object} [connectData] 
	 * @return {WebSocketClient}
	 */
	createClient(socket, options, connectData){
		let id = `${socket._socket.remoteAddress}:${socket._socket.remotePort}`;
		let defaults = {
			name: "WSClient"+id,
			id: id,
			logHandle: this.logger.handle
		};
		Object.extend(defaults, options);
		return new WebSocketClient(socket, defaults);
	}
}

module.exports = WebSocketServerListener;