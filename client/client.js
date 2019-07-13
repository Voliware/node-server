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
     * @param {*} socket - the socket itself (TCP, UDP, HTTP/S, WS/S)
     * @param {object} [options={}]
     * @param {number} [options.id]
     * @param {string} [options.name]
	 * @param {Message} [options.message=Message] - constructor to use for creating Messages
	 * @param {string} [options.data="buffer"] - the type of data the client receives
     * @param {string} [options.encoding="utf8"] - rx/tx buffer encoding
	 * @param {string} [options.eof="\r"] - rx/tx buffer end of datagram character
     * @param {string} [options.logHandle]
     * @param {number} [options.timeout=0] - how long it can take for a client to respond to the server
     * @param {number} [options.heartbeatFrequency=0] - how often to send a heartbeat, 0 for never
     * @param {function} [options.heartbeatRequest] - the heartbeat request function
     * @param {*} [options.connectData] - any additional data that came from connect
	 * @return {Client}
	 */
	constructor(socket, options = {}){
		super();
		this.socket = socket;
		this.id = options.id || 0;
        this.name = options.name || "Client" + this.id;
        
        // buffers
        this.data = options.data || "buffer";
        this.eof = options.eof || "\r";
        this.encoding = options.encoding || 'utf8';
        this.rxBuffer = new MessageBuffer(this.data, this.encoding, this.eof);

        // messaging
        this.message = options.message || Message;
        this.messageOptions = {
            encoding: this.encoding,
            eof: this.eof
        };
        
		// message router
		this.router = new Map();

		this.errorCount = 0;
        this.maxErrorCount = 4;
        this.lastPingSent = 0;
        this.latency = 0;
        this.timeout = 0;
        this.connectData = options.connectData || null;
        this.logger = new Logger(options.logHandle || this.name, this);

        // heartbeat
        this.heartbeatInterval = null;
        this.heartbeatFrequency = options.heartbeatFrequency || 0;
        this.heartbeatRequest = options.heartbeatRequest || this.heartbeatRequest;

        // init
        this.addDefaultRoutes();
        this.attachSocketHandlers(this.socket);

        if(this.heartbeatFrequency){
           // this.startHeartbeat();
        }

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
	 * Create a message.
	 * This uses the Message constructor
	 * passed in via the Client constructor options.
     * @param {object} [options=null] - message options
	 * @return {Message}
	 */
	createMessage(options = {}){
        Object.extend(options, this.messageOptions, options);
		return new this.message(options);
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
     * @return {null}
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
     * @return {null}
     */
    handleMessageHeartbeat(message){
        message.setDone();
        console.log("hi")
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
        this.heartbeatInterval = setInterval(this.heartbeatRequest.bind(this), this.heartbeatFrequency);
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
            // console.log(messages[i])
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
            // console.log(message);
            messages.push(message);
        }
		return messages;
    }
}

module.exports = Client;