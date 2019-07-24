const Client = require('../client/client');
const WebSocket = require('ws');

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
	 * @param {object} [options={}]
	 * @return {WebSocketClient}
	 */
	constructor(socket, options = {}){
        let defaults = {logHandle: "WebSocketClient"};
        super(socket, Object.extend(defaults, options));
		return this;
    }

    /**
     * Get the address of the socket,
     * such as 127.0.0.1, or localhost
     * @return {string}
     */
    getSocketAddress(){
		if(this.socket){
            return this.socket._socket.remoteAddress();
        }
    }

    /**
     * Get the port of the socket,
     * probably between 1 to 65535
     * @return {string}
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
        let self = this;
        
        // on open, emit open and ping the socket
        socket.on('open', function(data){
			self.logger.debug(`Connected:`);
			self.logger.debug(data);
            self.emit('open', data);
            setTimeout(function(){
                self.ping();
            }, 1000);
        })
        
        // on message, deserialize into message object
		socket.on('message', function(data){
            self.logger.debug('Received message:');
            self.logger.debug(data);
            
            let message = self.createMessage();
            message.deserialize(data);
            self.routeMessage(message);
        });

        // on error, increase the max error count
        // if max error is hit, emit maxError event
		socket.on('error', function(error){
			self.logger.error("Socket error:");
			self.logger.error(error);
            self.emit('error', error);
			self.errorCount++;
			if(self.errorCount >= self.maxErrorCount){
				self.emit('maxError');
                self.logger.error("Socket reached max errors");
			}
        });

        // on close, emit disconnect
		socket.on('close', function(code, reason){
            self.logger.debug(`Websocket closed with code: ${code}, reason: ${reason ? reason : "none"}`);
            self.emit('disconnect', {code, reason});
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