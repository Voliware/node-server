const EventEmitter = require('events').EventEmitter;
const Message = require('./../message/message');
const MessageBuffer = require('./../message/messageBuffer');
const Logger = require('@voliware/logger');

/**
 * Client.
 * Generic Client socket wrapper and event emitter.
 * This is used so that any type of socket can emit the same events.
 * It must implement 
 * - attachSocketHandlers
 * - write
 * - ping
 * - pong
 * It must emit
 * - message
 * - disconnect
 * - reconnect
 * - error
 * - maxError
 * - ping
 * - pong
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
	 * @param {Message} [options.message_type=Message] - constructor to use for creating Messages
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
        message_type = Message,
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
         * Message constructor
         * @type {Message|Function}
         */
        this.message_type = message_type;

        /**
         * Message options
         * @type {Object}
         */
        this.message_options = {
            encoding: this.encoding,
            eof: this.eof
        };
        
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
        this.addDefaultRoutes();
        this.attachSocketHandlers(this.socket);

        if(this.heartbeat.frequency){
           // this.startHeartbeat();
        }

		return this;
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
     * Set the client's id
     * @param {Number|String} id
     * @return {Client} 
     */
    setId(id){
        this.id = id;
        return this;
    }

    /**
     * Set the client's name
     * @param {String} name 
     * @return {Client} 
     */
    setName(name){
        this.name = name;
        return this;
    }
    
    /**
     * Record the latency as between 
     * now and when the last ping was sent
     * @return {Client}
     */
    recordLatency(){
        if(this.last_ping_sent){
            this.latency = Date.now() - this.last_ping_sent;
            this.logger.info(`Ping is ${this.latency} ms`);
        }
        this.last_ping_sent = 0;
        return this;
    }

    /**
     * Update when the last ping was sent
     * to the current timestamp.
     * @return {Client}
     */
    updateLastPingSent(){
        this.last_ping_sent = Date.now();
        return this;
    }

    /**
     * Attach handlers to the socket.
     * This handler should be able to emit
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
        throw new Error("attachSocketHandlers must be implemented");
    }

    /**
     * Disconnect the client.
     * @return {Client}
     */
    disconnect(){
        throw new Error("disconnect must be implemented");
    }
    
    /////////////////////////////////////////////////////////
    // Messaging and routing
    ////////////////////////////////////////////////////////
    
	/**
	 * Create a message.
	 * This uses the Message constructor
	 * passed in via the Client constructor options.
     * @param {Object} [options=null] - message options
	 * @return {Message}
	 */
	createMessage(options = {}){
        Object.extend(this.message_options, options);
		return new this.message_type(options);
	}

	/**
	 * Write data to the socket
	 * @param {*} data
	 * @return {*}
	 */
    write(data){
        throw new Error("write must be implemented");
    }

    /**
     * Serialize a Message and write to the socket.
     * @param {Message} msg 
	 * @return {*}
     */
    writeMessage(msg){
        return this.write(msg.serialize());
    }

    /**
     * Handle a ping message by returning a 
     * pong message as a response to the client's
     * intent of determining the latency or connection.
     * @param {Message} message 
     * @return {Message}
     */
    handleMessagePing(message){
        message.setDone();
        return this.createMessage({route: "/pong"});
    }

    /**
     * Handle a pong message by simply
     * recording the latency. The pong message
     * will always come from a client that has
     * just received a ping message.
     * @param {Message} message 
     * @return {Null}
     */
    handleMessagePong(message){
        this.recordLatency();
        message.setDone();
        return null;
    }

    /**
     * Handle a heartbeat message by returning
     * a heartbeat message.
     * @param {Message} message 
     * @return {Null}
     */
    handleMessageHeartbeat(message){
        message.setDone();
        return this.createMessage({route: "/hb"});
    }

    /**
     * Add the default routes to the router map.
     * @return {Client}
     */
	addDefaultRoutes(){
		this.router.set("/ping", this.handleMessagePing.bind(this));
        this.router.set("/pong", this.handleMessagePong.bind(this));
        this.router.set("/hb", this.handleMessageHeartbeat.bind(this));
		return this;
	}

    /**
     * Route a message to the Client's router.
     * @param {Message} message 
     * @return {Client}
     */
    routeMessage(message){
		let responseMessage = null;
		let route = this.router.get(message.route);
		if(route){
			responseMessage = route(message);
		}
		if(responseMessage){
            // console.log(responseMessage.route)
			this.writeMessage(responseMessage);
        }
        this.emit("message", message);
        return this;
    }

    /**
     * Ping the web socket
	 * @return {*|Number}
     */
    ping(){
        this.updateLastPingSent();
        let message = this.createMessage({route: "/ping"})
        return this.writeMessage(message);
    }

    /**
     * Pong the web socket
	 * @return {*|Number}
     */
    pong(){
        let message = this.createMessage({route: "/pong"})
        return this.writeMessage(message);
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
    // Heartbeat
    /////////////////////////////////////////////////////////

    /**
     * Create a heartbeat message and write to the socket.
     * @return {Client}
     */
    heartbeatRequest(){
        let msg = this.createMessage({route: "/hb"});
        this.writeMessage(msg);
        return this;
    }

    /**
     * Start the heartbeat interval.
     * @return {Client}
     */
    startHeartbeat(){
        this.heartbeat.interval = setInterval(heartbeat.request.bind(this), heartbeat.frequency);
        return this;
    }

    /**
     * Stop the heartbeat interval.
     * @return {Client}
     */
    stopHeartbeat(){
        clearInterval(this.heartbeat.interval);
        return this;
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
     * Process the rx buffer into Message objects.
     * For each message, emit a "message" event.
     * @param {Buffer} data 
     * @return {Client}
     */
    processRxData(data){
        this.rx_buffer.append(data);
        let datagrams = this.rx_buffer.split();
        let messages = this.datagramsToMessages(datagrams);
        
        for(let i = 0; i < messages.length; i++){
            this.routeMessage(messages[i]);
            this.emit('message', messages[i]);
        }
		return this;
    }

	/**
	 * Convert an array of Buffers or string
     * datagrams to an array of Message objects.
     * @param {Buffer[]|string[]} datagrams
     * @return {Message[]} - array of Messages
	 */
	datagramsToMessages(datagrams){
        let messages = [];
        for(let i = 0; i < datagrams.length; i++){
            let message = this.createMessage();
            message.deserialize(datagrams[i]);
            messages.push(message);
        }
		return messages;
    }
}

module.exports = Client;