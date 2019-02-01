const EventEmitter = require('events').EventEmitter;
const Logger = require('./../util/logger');

/**
 * Client.
 * Generic Client socket wrapper and event emitter.
 * This is used so that any type of
 * socket can emit the same events.
 * It must implement 
 * - attachSocketHandlers
 * - write
 * - ping
 * - pong
 * It must emit
 * - connect
 * - reconnect
 * - disconnect
 * - data
 * - error
 * - maxError
 * - ping
 * - pong
 * @extends {EventEmitter}
 */
class Client extends EventEmitter {

	/**
	 * Constructor
     * @param {*} socket - the socket itself (TCP, UDP, HTTP/S, WS/S)
     * @param {object} [options={}]
     * @param {number} [options.id]
     * @param {string} [options.logHandle]
     * @param {string} [options.name]
     * @param {*} [options.connectData] - any additional data that came from connect
	 * @return {Client}
	 */
	constructor(socket, options = {}){
		super();
		this.socket = socket;
		this.id = options.id || 0;
        this.name = options.name || "Client" + this.id;
        this.logger = new Logger(options.logHandle || this.name, this);
		this.errorCount = 0;
        this.maxErrorCount = 4;
        this.lastPingSent = 0;
        this.latency = 0;
        this.connectData = options.connectData || null;
        this.attachSocketHandlers(this.socket);
		return this;
    }

    /**
     * Get the address of the socket,
     * such as 127.0.0.1, or localhost
     * @return {string}
     */
    getSocketAddress(){
        throw new Error("getSocketAddress must be implemented")
    }

    /**
     * Get the port of the socket,
     * probably between 1 to 65535
     * @return {string}
     */
    getSocketPort(){
        throw new Error("getSocketPort must be implemented")
    }
    
    /**
     * Set the client's id
     * @param {number|string} id
     * @return {Client} 
     */
    setId(id){
        this.id = id;
        return this;
    }

    /**
     * Set the client's name
     * @param {string} name 
     * @return {Client} 
     */
    setName(name){
        this.name = name;
        return this;
    }

	/**
	 * Write a JSON string to the socket
	 * @param {object} msg
	 * @return {*}
	 */
	writeJson(msg){
		try{
            let jsonString = JSON.stringify(msg);
            return this.write(jsonString);
		}
		catch(e){
			this.logger.error("Msg is not JSON");
			this.logger.error(e);
        }
        return null;
    }
    
    /**
     * Record the latency as between 
     * now and when the last ping was sent
     * @return {Client}
     */
    recordLatency(){
        this.latency = Date.now() - this.lastPingSent;
        this.logger.info(`Ping is ${this.latency} ms`);
        return this;
    }

    /**
     * Update when the last ping was sent
     * to the current timestamp.
     * @return {Client}
     */
    updateLastPingSent(){
        this.lastPingSent = Date.now();
        return this;
    }

    /**
     * Attach handlers to the socket.
     * This handler should be able to emit
     * - connect
     * - reconnect
     * - disconnect
     * - data
     * - error
     * - maxError
     * - ping
     * - pong
     * @param {*} socket
     * @return {Client}
     */
    attachSocketHandlers(socket){
        throw new Error("attachSocketHandlers must be implemented");
    }

	/**
	 * Write a message to the socket
	 * @param {*} msg
	 * @return {*}
	 */
    write(msg){
        throw new Error("write must be implemented");
    }

	/**
	 * Write a ping message to the socket
	 * @return {*}
	 */
    ping(){
        throw new Error("ping must be implemented");
    }

	/**
	 * Write a pong message to the socket
	 * @return {*}
	 */
    pong(){
        throw new Error("pong must be implemented");
    }

	/**
	 * Convert to object
	 * @return {object}
	 */
	serialize(){
		return {
			id: this.id,
			name: this.name
		};
	}
}

module.exports = Client;