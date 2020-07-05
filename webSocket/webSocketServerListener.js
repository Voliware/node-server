const HttpServerListener = require('../http/httpServerListener');
const WebSocketServer = require('ws').Server;
const WebSocketClient = require('./webSocketClient');
const Server = require('../server/server');

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
     * @param {Object} [options={}]
     * @param {String} [options.host="localhost"]
     * @param {Number} [options.port=2222]
     * @param {Server} [options.http_server=null]
	 * @return {WebSocketServerListener}
	 */
	constructor({
        host = "localhost",
        port = 2222,
        http_server = null
    })
    {
        if(http_server){
            host = http_server.host;
            port = http_server.port;
        }

        super({host, port});    

        if(http_server){
            this.server = http_server.server_listener.getServer();
        }
        
        /**
         * The websocket server
         * @type {WebSocketServer}
         */
        this.web_socket_server = null;
	}

	/**
	 * Start an HTTP/S server and a WebSocket server.
	 * Begin listening on the WebSocket server.
	 */
	listen(){
        // Already have an HTTP server set
        if(this.server){
            this.logger.info(`Binding to HTTP server started on ${this.host} on port ${this.port}`);
            this.web_socket_server = this.createWebSocketServer(this.server);
        }
        // Create an HTTP server
        else {
            super.listen();
            this.web_socket_server = this.createWebSocketServer(this.server);
        }
        this.attachWebSocketServerHandlers();
	}

	/**
	 * Close the server listener.
	 */
	close(){
        if(this.http_server){
            this.http_server.close;
        }
        else {
            super.close();
        }
		this.web_socket_server.close();
	}

	/**
	 * Create a websocket server
	 * @param {Object} server - an http/s server
	 * @return {WebSocketServer}
	 */
	createWebSocketServer(server){
		return new WebSocketServer({server});
    }
    
    /**
     * Override to do nothing
     */
    attachHttpServerHandlers(){
    }

	/**
	 * Attach handlers to the web socket server.
	 * Create and emit a WebSocketClient via the connect event.
	 * @return {WebSocketServerListener}
	 */
	attachWebSocketServerHandlers(){
		this.web_socket_server.on('connection', (socket, req) => {
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