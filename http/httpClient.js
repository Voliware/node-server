const Client = require('./../client/client');

/**
 * HTTP Client
 * @extends {Client}
 */
class HttpClient extends Client {

    /**
     * Constructor
	 * @param {Socket} socket
	 * @param {object} [options={}]
     * @return {HttpClient}
     */
    constructor(socket, options = {}){
        let defaults = {logHandle: "HttpClient"};
        super(socket, Object.extend(defaults, options));
        this.logger.setLogLevel("debug");

        // number of connected sockets this client is using
        this.sockets = 0;
        return this;
    }

    /**
     * Increment the connected socket count.
     * @return {HttpClient}
     */
    incrementSocketCount(){
        this.sockets++;
        return this;
    }

    /**
     * Decrement the connected socket count.
     * @return {HttpClient}
     */
    decrementSocketCount(){
        this.sockets--;
        return this;
    }

    /**
     * Check the connected socket count.
     * If there are 0 connected sockets,
     * emit the "disconnect" event. 
     * @return {HttpClient}
     */
    checkSocketCount(){
        if(!this.sockets){
            this.emit('disconnected');
            this.logger.info("Disconnected");
        }
        return this;
    }

    /**
     * Attach handlers to the socket.
     * - close
     * - connect
     * - data
     * - drain
     * - end
     * - error
     * - drain
     * - lookup
     * - ready
     * - timeout
     * @param {*} socket
     * @return {Client}
     */ 
    attachSocketHandlers(socket){
        let self = this;
        socket.on('close', function(hadError){
            self.onClose(socket, hadError);
            self.decrementSocketCount();
            self.checkSocketCount();
        });
        socket.on('connect', function(){
            self.onConnect(socket);
        });
        socket.on('data', function(data){
            self.onData(socket, data);
        });
        socket.on('drain', function(){
            self.onDrain(socket);
        });
        socket.on('end', function(){
            self.onEnd(socket);
        });
        socket.on('error', function(error){
            self.onError(socket, error);
        });
        socket.on('lookup', function(error){
            self.onLookup(socket, error, address, family, host);
        });
        socket.on('ready', function(){
            self.onReady(socket);
        });
        socket.on('timeout', function(){
            self.onTimeout(socket);
        });
        return this;
    }

    /**
     * Socket "close" event handler
     * @param {Socket} socket 
     * @param {boolean} hadError 
     * @return {HttpClient}
     */
    onClose(socket, hadError){
        this.logger.debug(`Socket ${socket.remotePort} closed ${hadError ? "with an error"  : ""}`);
        return this;
    }

    /**
     * Socket "connect" event handler
     * @param {Socket} socket 
     * @return {HttpClient}
     */
    onConnect(socket){
        this.logger.debug(`Socket ${socket.remotePort} connected`);
        return this;
    }

    /**
     * Socket "data" event handler
     * @param {Socket} socket 
     * @param {Buffer} data
     * @return {HttpClient}
     */
    onData(socket, data){
        this.logger.debug(`Socket ${socket.remotePort} data`);
        // this.logger.debug(data);
        return this;
    }

    /**
     * Socket "drain" event handler
     * @param {Socket} socket 
     * @return {HttpClient}
     */
    onDrain(socket){
        this.logger.debug(`Socket ${socket.remotePort} drain`);
        return this;
    }

    /**
     * Socket "connect" event handler
     * @param {Socket} socket 
     * @return {HttpClient}
     */
    onEnd(socket){
        this.logger.debug(`Socket ${socket.remotePort} end`);
        return this;
    }

    /**
     * Socket "error" event handler
     * @param {Socket} socket 
     * @param {object} error
     * @return {HttpClient}
     */
    onError(socket, error){
        this.logger.debug(`Socket ${socket.remotePort} error`);
        this.logger.debug(error);
        return this;
    }

    /**
     * Socket "connect" event handler
     * @param {Socket} socket 
     * @param {object} error
     * @param {string} family
     * @param {string} host
     * @return {HttpClient}
     */
    onLookup(socket, error, address, family, host){
        this.logger.debug(`Socket ${socket.remotePort} lookup`);
        this.logger.debug(error);
        this.logger.debug(`address: ${address}, family: ${family}, host: ${host}`);
        return this;
    }

    /**
     * Socket "ready" event handler
     * @param {Socket} socket 
     * @return {HttpClient}
     */
    onReady(socket){
        this.logger.debug(`Socket ${socket.remotePort} ready`);
        return this;
    }

    /**
     * Socket "timeout" event handler
     * @param {Socket} socket 
     * @return {HttpClient}
     */
    onTimeout(socket){
        this.logger.debug(`Socket ${socket.remotePort} timeout`);
        return this;
    }

    /**
     * Do not do anything on pings/pongs
     */
    ping(){
        return this;
    }
}

module.exports = HttpClient;