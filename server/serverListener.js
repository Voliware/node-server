const EventEmitter = require('events').EventEmitter;
const Logger = require('@voliware/logger');
const ClientManager = require('./../client/clientManager');

/**
 * An abstract server connection listener.
 * A server connection listener is some object that listens on 
 * some host, port for any protocol. When a new socket is 
 * established, it is up to the ServerListener to wrap that
 * socket in some type of Client and emit that Client to the Server.
 * It must implement the following method
 * - createClientSocket(socket, data)
 * - listen(options)
 * It must emit the following listener events
 * - connect(socket, data)
 * - disconnect(code, reason)
 * The ServerListener comes with a ClientManager, but 
 * it may or may not be needed. It is needed in use-cases
 * like UDP client management, where the client connection
 * opens and closes for each message, and is not persistent.
 * It is also needed for HTTP clients who will connect from
 * a different port for every HTTP request.
 * @extends {EventEmitter}
 */
class ServerListener extends EventEmitter {

    /**
     * Constructor
     * @param {object} [options={}]
     * @param {object} [options.clientOptions={}] - options to pass to created crients
     * @param {string} [options.host="localhost"]
     * @param {number} [options.port=1337]
     * @param {number} [options.maxError=10]
     * @param {string} [options.logHandle]
     * @return {ServerListener}
     */
    constructor(options = {}){
        super();
        this.options = options;
        this.server = null;
		this.host = options.host || "localhost";
        this.port = options.port || 1337;
        this.clientOptions = options.clientOptions || {};
		this.clientManager = new ClientManager();
        this.maxErrors = isNaN(options.maxError) ? 10 : options.maxError;
        this.logger = new Logger(options.logHandle || this.host, this);
        return this;
    }

    /**
     * Begin listening.
     * @param {object} [options]
	 * @return {ServerListener}
     */
    listen(options){
        throw new Error("listen must be implemented");
    }

	/**
	 * Close the server listener
	 * @return {ServerListener}
	 */
    close(){
        throw new Error("close must be implemented");
    }

    /**
     * Create a Client that has a socket of some kind.
     * @param {*} socket 
     * @param {object} [options]
     * @param {string} [options.logHandle]
     * @param {*} data
     * @return {Client} 
     */
    createClient(socket, options = {}, data){
        throw new Error("createClient must be implemented");
    }

	/**
	 * Set the ClientManager.
	 * @param {ClientManager} clientManager 
	 * @return {ServerListener}
	 */
	setClientManager(clientManager){
		this.clientManager = clientManager;
		return this;
	}
}

module.exports = ServerListener