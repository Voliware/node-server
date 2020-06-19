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
    }

    /**
     * Increment the connected socket count.
     */
    incrementSocketCount(){
        this.socket_count++;
    }

    /**
     * Decrement the connected socket count.
     */
    decrementSocketCount(){
        this.socket_count--;
    }

    /**
     * Check the connected socket count.
     * If there are 0 connected sockets,
     * emit the "disconnect" event. 
     */
    checkSocketCount(){
        if(!this.socket_count){
            this.emit('disconnected');
            this.logger.info("Disconnected");
        }
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
    }

    /**
     * Socket "close" event handler
     * @param {Socket} socket 
     * @param {Boolean} hadError 
     */
    onClose(socket, hadError){
        this.logger.debug(`Socket ${socket.remotePort} closed ${hadError ? "with an error"  : ""}`);
    }

    /**
     * Socket "connect" event handler
     * @param {Socket} socket 
     */
    onConnect(socket){
        this.logger.debug(`Socket ${socket.remotePort} connected`);
    }

    /**
     * Socket "data" event handler
     * @param {Socket} socket 
     * @param {Buffer} data
     */
    onData(socket, data){
        this.logger.debug(`Socket ${socket.remotePort} data`);
    }

    /**
     * Socket "drain" event handler
     * @param {Socket} socket 
     */
    onDrain(socket){
        this.logger.debug(`Socket ${socket.remotePort} drain`);
    }

    /**
     * Socket "connect" event handler
     * @param {Socket} socket 
     */
    onEnd(socket){
        this.logger.debug(`Socket ${socket.remotePort} end`);
    }

    /**
     * Socket "error" event handler
     * @param {Socket} socket 
     * @param {Object} error
     */
    onError(socket, error){
        this.logger.debug(`Socket ${socket.remotePort} error`);
        this.logger.debug(error);
    }

    /**
     * Socket "connect" event handler
     * @param {Socket} socket 
     * @param {Object} error
     * @param {String} family
     * @param {String} host
     */
    onLookup(socket, error, address, family, host){
        this.logger.debug(`Socket ${socket.remotePort} lookup`);
        this.logger.debug(error);
        this.logger.debug(`address: ${address}, family: ${family}, host: ${host}`);
    }

    /**
     * Socket "ready" event handler
     * @param {Socket} socket 
     */
    onReady(socket){
        this.logger.debug(`Socket ${socket.remotePort} ready`);
    }

    /**
     * Socket "timeout" event handler
     * @param {Socket} socket 
     */
    onTimeout(socket){
        this.logger.debug(`Socket ${socket.remotePort} timeout`);
    }
}

module.exports = HttpClient;