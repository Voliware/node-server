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
        return this;
    }

    /**
     * Attach handlers to the socket.
     * - reconnect
     * - disconnect
     * - message
     * - error
     * - maxError
     * - ping
     * - pong
     * @param {*} socket
     * @return {Client}
     */
    attachSocketHandlers(socket){
        socket.on('close', this.onClose.bind(this));
        socket.on('connect', this.onConnect.bind(this));
        socket.on('data', this.onData.bind(this));
        socket.on('drain', this.onDrain.bind(this));
        socket.on('end', this.onEnd.bind(this));
        socket.on('error', this.onError.bind(this));
        socket.on('drain', this.onDrain.bind(this));
        socket.on('lookup', this.onLookup.bind(this));
        socket.on('ready', this.onReady.bind(this));
        socket.on('timeout', this.onTimeout.bind(this));
        return this;
    }

    onClose(hadError){
        this.logger.debug("Client closed" + (hadError ? " with an error " : ""));
        return this;
    }

    onConnect(){
        this.logger.debug("Client connected");
        return this;
    }

    onData(data){
        this.logger.debug("Client data");
        this.logger.debug(data);
        return this;
    }

    onDrain(){
        this.logger.debug("Client drain");
        return this;
    }

    onEnd(){
        this.logger.debug("Client drain");
        return this;
    }

    onError(error){
        this.logger.debug("Client error");
        this.logger.debug(error);
        return this;
    }

    onLookup(error){
        this.logger.debug("Client lookup");
        this.logger.debug(error, address, family, host);
        return this;
    }

    onReady(){

    }

    onTimeout(){

    }

    ping(){
        
    }
}

module.exports = HttpClient;