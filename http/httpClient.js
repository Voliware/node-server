const Client = require('./../client/client');

/**
 * HTTP Client
 * @extends {Client}
 */
class HttpClient extends Client {

    /**
     * Constructor
	 * @param {Socket} socket
     * @param {Object} options
     * @param {Number} options.id
     * @return {HttpClient}
     */
    constructor(socket, {id = 0}){
        super(socket, {id});

        /**
         * Number of connected sockets this client is using
         * @type {Number}
         */
        this.socket_count = 0;
        
        return this;
    }

    /**
     * Increment the connected socket count.
     * @return {HttpClient}
     */
    incrementSocketCount(){
        this.socket_count++;
        return this;
    }

    /**
     * Decrement the connected socket count.
     * @return {HttpClient}
     */
    decrementSocketCount(){
        this.socket_count--;
        return this;
    }

    /**
     * Check the connected socket count.
     * If there are 0 connected sockets,
     * emit the "disconnect" event. 
     * @return {HttpClient}
     */
    checkSocketCount(){
        if(!this.socket_count){
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
        socket.on('close', (hadError) => {
            this.onClose(socket, hadError);
            this.decrementSocketCount();
            this.checkSocketCount();
        });
        socket.on('connect', () => {
            this.onConnect(socket);
        });
        socket.on('data', (data) => {
            this.onData(socket, data);
        });
        socket.on('drain', () => {
            this.onDrain(socket);
        });
        socket.on('end', () => {
            this.onEnd(socket);
        });
        socket.on('error', (error) => {
            this.onError(socket, error);
        });
        socket.on('lookup', (error) => {
            this.onLookup(socket, error, address, family, host);
        });
        socket.on('ready', () => {
            this.onReady(socket);
        });
        socket.on('timeout', () => {
            this.onTimeout(socket);
        });
        return this;
    }

    /**
     * Socket "close" event handler
     * @param {Socket} socket 
     * @param {Boolean} hadError 
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
     * @param {Object} error
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
     * @param {Object} error
     * @param {String} family
     * @param {String} host
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