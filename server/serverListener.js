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
     * @param {Object} [options={}]
     * @param {String} [options.host="localhost"]
     * @param {Number} [options.port=1337]
     * @return {ServerListener}
     */
    constructor({
        host = "localhost",
        port = 1337
    })
    {
        super();

        /**
         * Network host
         * @type {String}
         */
		this.host = host;

        /**
         * Network port to listen on
         * @type {Number}
         */
        this.port = port;
        
        /**
         * Client manager
         * @type {ClientManager}
         */
        this.client_manager = new ClientManager();

        /**
         * Node server object
         * @type {Server}
         */
        this.server = null;

        /**
         * Logger object
         * @type {Logger}
         */
        this.logger = new Logger(this.constructor.name, {
            context: `${this.host}:${this.port}`,
            level: "debug"
        });
    }

    /**
     * Begin listening.
     * @param {Object} [options]
     */
    listen(options){
        throw new Error("listen must be implemented");
    }

	/**
	 * Close the server listener
	 */
    close(){
        throw new Error("close must be implemented");
    }

    /**
     * Create a Client that has a socket of some kind.
     * @param {*} socket 
     * @param {Object} [options]
     * @param {String} [options.log_handle]
     * @param {*} data
     * @return {Client} 
     */
    createClient(socket, options = {}, data){
        throw new Error("createClient must be implemented");
    }

	/**
	 * Set the ClientManager.
	 * @param {ClientManager} client_manager 
	 */
	setClientManager(client_manager){
		this.client_manager = client_manager;
	}
}

module.exports = ServerListener