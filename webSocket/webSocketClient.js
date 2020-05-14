const Client = require('../client/client');
const WebSocket = require('ws');
const JsonMessage = require('./../json/jsonMessage');

/**
 * WebSocket Client.
 * Wraps the WebSocket that was emitted from the 
 * WebSocketServerListener.
 * @extends {Client}
 */
class WebSocketClient extends Client {

	/**
	 * Constructor
	 * @param {WebSocket} socket
	 * @param {Object} [options={}]
	 * @return {WebSocketClient}
	 */
	constructor(socket, {id = 0, message_type = JsonMessage}){
        super(socket, {id, message_type});
		return this;
    }

    /**
     * Get the address of the socket,
     * such as 127.0.0.1, or localhost
     * @return {String}
     */
    getSocketAddress(){
		if(this.socket){
            return this.socket._socket.remoteAddress();
        }
    }

    /**
     * Get the port of the socket,
     * probably between 1 to 65535
     * @return {String}
     */
    getSocketPort(){
		if(this.socket){
            return this.socket._socket.remotePort;
        }
    }

	/**
	 * Attach handlers to the WebSocket.
     * The websocket events will emit the standard ClientSocket events.
     * If debug logs are enabled, all events are logged.
     * If the socket hits max errors, the maxError event is emitted.
	 * @param {WebSocket} socket
	 * @return {WebSocketClient}
	 */
    attachSocketHandlers(socket){
        // on open, emit open and ping the socket
        socket.on('open', (data) => {
			this.logger.debug(`Connected:`);
			this.logger.debug(data);
            this.emit('open', data);
            setTimeout(() => {
                this.ping();
            }, 1000);
        })
        
        // on message, deserialize into message object
		socket.on('message', (data) => {
            this.logger.debug('Received message:');
            this.logger.debug(data);
            
            let message = this.createMessage();
            message.deserialize(data);
            this.routeMessage(message);
        });

        // on error, increase the max error count
        // if max error is hit, emit maxError event
		socket.on('error', (error) => {
			this.logger.error("Socket error:");
			this.logger.error(error);
            this.emit('error', error);
			this.error_count++;
        });

        // on close, emit disconnect
		socket.on('close', (code, reason) => {
            this.logger.debug(`Websocket closed with code: ${code}, reason: ${reason ? reason : "none"}`);
            this.emit('disconnect', {code, reason});
		});
		return this;
	}

    /**
     * Disconnect the client.
     * @return {WebSocketClient}
     */
    disconnect(){
		this.socket.close(0, "");
		return this;
    }

	/**
	 * Write data to the socket.
     * Will check if the socket is open or not.
     * If it is not, fails by returning null.
	 * @param {*} data
	 * @return {*|Number|null} - returns null if it failed
	 */
	write(data){
        if(this.socket.readyState === WebSocket.OPEN){
            return this.socket.send(data);
        }
        else {
            this.logger.error("Socket is not open");
            return null;
        }
	}
}

module.exports = WebSocketClient;