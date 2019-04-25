const EventEmitter = require('events').EventEmitter;
const Message = require('./../message/message');
const MessageBuffer = require('./../message/messageBuffer');
const Logger = require('./../util/logger');

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
     * @param {*} socket - the socket itself (TCP, UDP, HTTP/S, WS/S)
     * @param {object} [options={}]
     * @param {number} [options.id]
     * @param {string} [options.name]
	 * @param {Message} [options.message=Message] - constructor to use for creating Messages
	 * @param {string} [options.dataType="buffer"] - the type of data the client receives
     * @param {string} [options.bufferEncoding="utf8"] - rx/tx buffer encoding
	 * @param {string} [options.bufferEof="\r"] - rx/tx buffer end of datagram character
     * @param {string} [options.logHandle]
     * @param {number} [options.heartbeatFrequency=10000] - how often to send a heartbeat
     * @param {*} [options.connectData] - any additional data that came from connect
	 * @return {Client}
	 */
	constructor(socket, options = {}){
		super();
		this.socket = socket;
		this.id = options.id || 0;
        this.name = options.name || "Client" + this.id;
        
        // buffers
        this.dataType = options.dataType || "buffer";
        this.bufferEof = options.bufferEof || "\r";
        this.bufferEncoding = options.txBufferEncoding || 'utf8';
        this.rxBuffer = new MessageBuffer(this.dataType, this.bufferEncoding, this.bufferEof);

        // messaging
        this.messageConstructor = options.message || Message;
        this.messageOptions = {
            encoding: this.bufferEncoding,
            eof: this.bufferEof
        };
        
		// message router
		this.router = new Map();

		this.errorCount = 0;
        this.maxErrorCount = 4;
        this.lastPingSent = 0;
        this.latency = 0;
        this.connectData = options.connectData || null;
        this.logger = new Logger(options.logHandle || this.name, this);

        // heartbeat
        this.heartbeatInterval = null;
        this.heartbeatFrequency = options.heartbeatFrequency || 10000;

        // init
        this.addDefaultRoutes();
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
     * Set the options for creating 
     * messages to send to the client and for
     * processing received data from the client.
     * @param {Message} message 
     * @return {Client} 
     */
    setMessageOptions(options){
        if(options.constructor){
            this.messageConstructor = options.constructor;
        }
        if(options.type){
            this.dataType = options.type;
        }
        if(options.eof){
            this.bufferEof = options.eof;
        }
        if(options.encoding){
            this.bufferEncoding = options.encoding;
        }
        this.messageOptions = {
            encoding: this.bufferEncoding,
            eof: this.bufferEof
        };
        this.rxBuffer = new MessageBuffer(this.dataType, this.bufferEncoding, this.bufferEof);
        return this;
    }
    
	/**
	 * Create a message.
	 * This uses the Message constructor
	 * passed in via the Client constructor options.
     * @param {object} [options=null] - message options
	 * @return {Message}
	 */
	createMessage(options = null){
        let _options = {};
        if(options){
            // clone the default message options
            _options = Object.assign({}, this.messageOptions);
            // extend with passed in options
            Object.extend(_options, options);
        }
        else {
            _options = this.messageOptions;
        }
		return new this.messageConstructor(_options);
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
     * This will take any kind of message.
     * By default, it will create a new message from
     * the Client's message constructor.
     * @param {Message} msg 
     * @param {boolean} [useClientMessageType=true] - whether to convert the passed message
     *                                                into the same type that this Client uses.
	 * @return {*}
     */
    writeMessage(msg, useClientMessageType = true){
        let message = msg;
        if(useClientMessageType){
            message = this.createMessage(message);
        }
        return this.write(message.serialize());
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
        return this.createMessage({route: Client.route.pong});
    }

    /**
     * Handle a pong message by simply
     * recording the latency. The pong message
     * will always come from a client that has
     * just received a ping message.
     * @param {Message} message 
     * @return {null}
     */
    handleMessagePong(message){
        this.recordLatency();
        message.setDone();
        return null;
    }

    /**
     * Add the default routes to the router map.
     * @return {Client}
     */
	addDefaultRoutes(){
		this.router.set(Client.route.ping, this.handleMessagePing.bind(this));
		this.router.set(Client.route.pong, this.handleMessagePong.bind(this));
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
        let message = this.createMessage({route: Client.route.ping})
        return this.writeMessage(message);
    }

    /**
     * Pong the web socket
	 * @return {*|Number}
     */
    pong(){
        let message = this.createMessage({route: Client.route.pong})
        return this.writeMessage(message);
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

    /////////////////////////////////////////////////////////
    // Heartbeat
    /////////////////////////////////////////////////////////

    /**
     * Start the heartbeat interval.
     * @return {Client}
     */
    startHeartbeat(){
        this.heartbeatInterval = setInterval(this.heartbeat.bind(this), this.heartbeatFrequency);
        return this;
    }

    /**
     * Stop the heartbeat interval.
     * @return {Client}
     */
    stopHeartbeat(){
        clearInterval(this.heartbeatInterval);
        return this;
    }
    
    /////////////////////////////////////////////////////////
    // Buffer Support
    // The following buffer functions are only needed if 
    // the client must use a buffer to receive data
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
        this.rxBuffer.append(data);
        let datagrams = this.rxBuffer.split();
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
            console.log(message);
            messages.push(message);
        }
		return messages;
    }
}
Client.route = {
    ping: "/ping",
    pong: "/pong"
};

module.exports = Client;