const EventEmitter = require('events').EventEmitter;
const Logger = require('../util/logger');

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
 * @extends {EventEmitter}
 */
class ServerListener extends EventEmitter {

    /**
     * Constructor
     * @param {object} [options={}]
     * @param {string} [options.host="localhost"]
     * @param {number} [options.port=1337]
     * @param {number} [options.maxError=10]
     * @param {string} [options.logHandle]
     * @return {ServerListener}
     */
    constructor(options = {}){
        super();
        this.server = null;
		this.host = options.host || "localhost";
        this.port = options.port || 1337;
        this.maxErrors = isNaN(options.maxError) ? 10 : options.maxError;
        this.logger = new Logger(options.logHandle || this.host, this);
        return this;
    }

    /**
     * Begin listening.
     * @param {object} [options]
     */
    listen(options){
        throw new Error("listen must be implemented");
    }

    /**
     * Create a Client that has a socket of some kind.
     * @param {*} socket 
     * @param {object} [options]
     * @param {string} [options.logHandle]
     * @param {*} data
     * @return {Client} 
     */
    createClient(socket, options, data){
        throw new Error("createClient must be implemented");
    }
}

module.exports = ServerListener