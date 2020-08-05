const EventEmitter = require('events').EventEmitter;
const MessageBuffer = require('./../message/messageBuffer');
const Logger = require('@voliware/logger');

/**
 * Client.
 * Generic Client socket wrapper and event emitter.
 * This is used so that any type of socket can emit the same events.
 * It must implement 
 * - attachSocketHandlers
 * - write
 * It must emit
 * - message
 * - disconnect
 * - reconnect
 * - error
 * - maxError
 * To use ping(), you must implement createPingMessage()
 * To use pong(), you must implement createPongMessage()
 * To use the heartbeat, you must implement createHeartbeatMessage()
 * If the client receives non-textual data, such as a 
 * TCP or UDP client receiving Buffer data, an rxBuffer is
 * available to store and parse the data into Message objects.
 * @extends {EventEmitter}
 */
class Client extends EventEmitter {

	/**
	 * Constructor
     * @param {Object} socket - the socket itself (TCP, UDP, HTTP/S, WS/S)
     * @param {Object} [options={}]
     * @param {Number} [options.id]
	 * @param {String} [options.data="buffer"] - the type of data the client receives
     * @param {String} [options.encoding="utf8"] - rx/tx buffer encoding
	 * @param {String} [options.eof="\r"] - rx/tx buffer end of datagram character
     * @param {Number} [options.timeout=0] - how long it can take for a client to respond to the server
     * @param {Object} [options.heartbeat]
     * @param {Number} [options.heartbeat=0] - how often to send a heartbeat, 0 for never
     * @param {Object} [options.connect_data] - any additional data that came from connect
	 * @return {Client}
	 */
	constructor(socket, {
        id = 0,
        data_type = "buffer",
        encoding = "utf8",
        eof = "\r",
        timeout = 0,
        heartbeat = 0,
        connect_data = null
    })
    {
        super();
        
        /**
         * The network sockety.
         * TCP, UDP, HTTP, WS, or other.
         * @type {Object}
         */
        this.socket = socket;
        
        /**
         * Unique id
         * @type {Number}
         */
        this.id = id;
        
        /**
         * Type of data the socket receives
         * @type {String}
         */
        this.data_type = data_type;
        
        /**
         * Data that arrived with the socket connection.
         * @type {Object}
         */
        this.connect_data = connect_data;
        
        /**
         * Client activity timeout.
         * 0 for no timeout.
         * @type {Number}
         */
        this.timeout = timeout;

        /**
         * End of message delimter.
         * @type {String}
         */
        this.eof = eof;
        
        /**
         * The message encoding
         * @type {String}
         */
        this.encoding = encoding;

        /**
         * A receive buffer for incoming messages.
         * @type {MessageBuffer}
         */
        this.rx_buffer = new MessageBuffer({
            type: this.data_type, 
            encoding: this.encoding, 
            eof: this.eof
        });
        
        /**
         * Message router
         * @type {Map}
         */
		this.router = new Map();

        /**
         * Number of errors encountered
         * @type {Number}
         */
        this.error_count = 0;
        
        /**
         * Timestamp of last ping sent
         * @type {Number}
         */
        this.last_ping_sent = 0;
        
        /**
         * Latency in ms
         * @type {Number}
         */
        this.latency = 0;

        /**
         * Logging object
         * @type {Logger}
         */
        this.logger = new Logger(this.constructor.name, {
            context: this.id,
            level: "debug"
        });

        /**
         * Heartbeat
         * @type {Object}
         */
        this.heartbeat = {

            /**
             * Heartbeat interval object id.
             * @type {Number}
             */
            interval: null,

            /**
             * How often to send a heartbeat in ms.
             * @type {Number}
             */
            frequency: heartbeat,

            /**
             * Heartbeat request function
             * @type {Function}
             */
            request: null
        }

        // init
        this.attachSocketHandlers(this.socket);

        if(this.heartbeat.frequency){
            this.startHeartbeat();
        }
    }

    /**
     * Get the address of the socket,
     * such as 127.0.0.1, or localhost
     * @return {String}
     */
    getSocketAddress(){
        throw new Error("getSocketAddress must be implemented")
    }

    /**
     * Get the port of the socket,
     * probably between 1 to 65535
     * @return {String}
     */
    getSocketPort(){
        throw new Error("getSocketPort must be implemented")
    }

    /**
     * Get the client's ID
     * @returns {String}
     */
    getId(){
        return this.id;
    }
    
    /**
     * Set the client's id
     * @param {Number|String} id
     */
    setId(id){
        this.id = id;
    }

    /**
     * Get the client's name
     * @returns {String}
     */
    getName(){
        return this.name;
    }

    /**
     * Set the client's name
     * @param {String} name 
     */
    setName(name){
        this.name = name;
    }

    /**
     * Attach handlers to the socket.
     * These handlers should be able emit
     * - reconnect
     * - disconnect
     * - message
     * - error
     * - maxError
     * @param {*} socket
     */
    attachSocketHandlers(socket){
        throw new Error("attachSocketHandlers must be implemented");
    }

    /**
     * Disconnect the client.
     */
    disconnect(){
        throw new Error("disconnect must be implemented");
    }
    
    /////////////////////////////////////////////////////////
    // Messaging and routing
    ////////////////////////////////////////////////////////

	/**
	 * Write data to the socket
	 * @param {*} data
	 * @return {*}
	 */
    write(data){
        throw new Error("write must be implemented");
    }

    /**
     * Route a message 
     * @param {*} message 
     */
    routeMessage(message){
    }

	/**
	 * Convert to object
	 * @return {Object}
	 */
	serialize(){
		return {
			id: this.id,
			name: this.name
		};
    }

    /////////////////////////////////////////////////////////
    // Ping, Pong, Latency
    /////////////////////////////////////////////////////////

    /**
     * Create a ping message.
     * Must be implemented.
     * @return {*}
     */
    createPingMessage(){
        throw new Error("createPingMessage must be defined");
    }

    /**
     * Create a ping message and write to the socket.
     */
    ping(){
        let msg = this.createPingMessage();
        this.write(msg);
    }

    /**
     * Create a pong message.
     * Must be implemented.
     * @return {*}
     */
    createPongMessage(){
        throw new Error("createPongMessage must be defined");
    }

    /**
     * Create a pong message and write to the socket.
     */
    pong(){
        let msg = this.createPongMessage();
        this.write(msg);
    }
    
    /**
     * Record the latency as between 
     * now and when the last ping was sent
     */
    recordLatency(){
        if(this.last_ping_sent){
            this.latency = Date.now() - this.last_ping_sent;
            this.logger.debug(`Ping is ${this.latency} ms`);
        }
        this.last_ping_sent = 0;
    }

    /**
     * Update when the last ping was sent
     * to the current timestamp.
     */
    updateLastPingSent(){
        this.last_ping_sent = Date.now();
    }

    /////////////////////////////////////////////////////////
    // Heartbeat
    /////////////////////////////////////////////////////////

    /**
     * Create a heartbeat message.
     * Must be implemented.
     * @return {*}
     */
    createHeartbeatMessage(){
        throw new Error("createHeartbeatMessage must be defined");
    }

    /**
     * Create a heartbeat message and write to the socket.
     */
    heartbeatRequest(){
        let msg = this.createHeartbeatMessage();
        this.write(msg);
    }

    /**
     * Start the heartbeat interval.
     */
    startHeartbeat(){
        this.heartbeat.interval = setInterval(
            this.heartbeat.request.bind(this), 
            this.heartbeat.frequency
        );
    }

    /**
     * Stop the heartbeat interval.
     */
    stopHeartbeat(){
        clearInterval(this.heartbeat.interval);
    }
    
    /////////////////////////////////////////////////////////
    // Buffer Support
    // The following buffer functions are only needed if 
    // the client must use a buffer to receive data
    // TODO: replace with a @voliware/data-transform
    ////////////////////////////////////////////////////////

    /**
     * Process received data buffer.
     * Append the data to the rx buffer.
     * Process the rx buffer into messages.
     * For each message, emit a "message" event.
     * @param {Buffer} data 
     */
    processRxData(data){
        this.rx_buffer.append(data);
        let messages = this.rx_buffer.split();
        
        for(let i = 0; i < messages.length; i++){
            this.logger.debug(messages[i]);
            this.routeMessage(messages[i]);
            this.emit('message', messages[i]);
        }
    }
}

module.exports = Client;