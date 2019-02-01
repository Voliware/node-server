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
            self.emit('connect', data);
            setTimeout(function(){
                self.ping();
            }, 1000);
        })
        // always try and parse a message into json
        // if it is not json, it must be a ping or pong
        // otherwise we do not support it
		socket.on('message', function(data){
            self.logger.debug('Received message:');
			self.logger.debug(data);
			try{
				let json = JSON.parse(data);
                self.emit('data', json);
			}
			catch(e) {
                if(data === "ping"){
					self.logger.info('Websocket ping');
					self.emit('ping');
                    self.pong();
                }
                else if(data === "pong"){
                    self.logger.info('Websocket pong');
					self.emit('pong');
                    self.recordLatency();
                }
                else {
                    self.logger.warn('Data is not json or ping');
                    self.logger.error(e);
					self.emit('error', e);
                }
			}
        });
        // on error, increase the max error count
        // if max error is hit, emit maxError event
		socket.on('error', function(error){
			self.logger.error("Error:");
			self.logger.error(error);
            self.emit('error', error);
			self.errorCount++;
			if(self.errorCount >= self.maxErrorCount){
				self.emit('maxError');
			}
        });
        // on close, emit disconnect
		socket.on('close', function(code, reason){
            self.logger.debug(`Websocket closed with code: ${code}, reason: ${reason ? reason : "none"}`);
            self.emit('disconnect', code, reason);
		});
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

    /**
     * Ping the web socket
	 * @return {*|Number}
     */
    ping(){
        this.updateLastPingSent();
        return this.write("ping");
    }

    /**
     * Pong the web socket
	 * @return {*|Number}
     */
    pong(){
        return this.write("pong");
    }
}

module.exports = WebSocketClient;