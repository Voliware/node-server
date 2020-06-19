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
	}

	/**
	 * Start an HTTP/S server and a WebSocket server.
	 * Begin listening on the WebSocket server.
	 */
	listen(){
        super.listen();
        this.webSocketServer = this.createWebSocketServer(this.server);
        this.attachWebSocketServerHandlers();
	}

	/**
	 * Close the server listener.
	 */
	close(){
        super.close();
		this.webSocketServer.close();
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
    }

	/**
	 * Attach handlers to the web socket server.
	 * Create and emit a WebSocketClient via the connect event.
	 * @return {WebSocketServerListener}
	 */
	attachWebSocketServerHandlers(){
		this.webSocketServer.on('connection', (socket, req) => {
			this.logger.info('WebSocket connected');
			let client = this.createClient(socket);
			this.emit('connect', client, req);
		});
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