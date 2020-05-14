const HttpServerListener = require('../http/httpServerListener');
const WebSocketServer = require('ws').Server;
const WebSocketClient = require('./webSocketClient');

/**
 * WebSocket based ServerListener.
 * This creates an HTTP/S server which is passed into a WebSocketServer.
 * The WebSocketServer will emit connection events.
 * On a connection, WebSocketServerListener will emit a 
 * "connect" event with a WebSocketClientSocket. 
 * @extends {HttpServerListener}
 */
class WebSocketServerListener extends HttpServerListener {

	/**
	 * Constructor
	 * @param {Object} [options]
	 * @return {WebSocketServerListener}
	 */
	constructor(options = {}){
		super(options);
		return this;
	}

	/**
	 * Start an HTTP/S server and a WebSocket server.
	 * Begin listening on the WebSocket server.
	 * @return {WebSocketServerListener}
	 */
	listen(){
        super.listen();
        this.webSocketServer = this.createWebSocketServer(this.server);
        this.attachWebSocketServerHandlers();
		return this;
	}

	/**
	 * Close the server listener.
	 * @return {WebSocketServerListener}
	 */
	close(){
        super.close();
		this.webSocketServer.close();
		return this;
	}

	/**
	 * Create a websocket server
	 * @param {Object} server - an http/s server
	 * @return {WebSocketServer}
	 */
	createWebSocketServer(server){
		return new WebSocketServer({server});
    }
    
    attachHttpServerHandlers(){
        return this;
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
	 * @return {WebSocketClient}
	 */
	createClient(socket){
		let id = `@${socket._socket.remoteAddress}:${socket._socket.remotePort}`;
		return new WebSocketClient(socket, {id});
	}
}

module.exports = WebSocketServerListener;