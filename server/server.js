const EventEmitter = require('events').EventEmitter;
const Message = require('../message/message');
const JsonMessage = require('../json/jsonMessage');
const ServerListener = require('./serverListener');
const ServerMonitor = require('./serverMonitor');
const Client = require('./../client/client');
const ClientManager = require('./../client/clientManager');
const ObjectManager = require('./../util/objectManager');
const Room = require('./../room/room');
const Logger = require('@voliware/logger');

/**
 * Generic Server with Client and Room management.
 * Requires a ServerListener that listens on some protocol
 * for connections and disconnections.
 * The Server handles a lot of basic server requests, 
 * like retrieving clients and managing rooms.
 * @extends {EventEmitter}
 */
class Server extends EventEmitter {

	/**
	 * Constructor
	 * @param {Object} [options={}]
     * @param {String} [options.host="localhost"] - the host address
     * @param {Number} [options.port=3000] - the port to listen on
     * @param {String} [options.data="buffer"] - for tcp/udp, what format to send/receive data in, ie buffer or string.
     *                                          For Websocket, this is not relevant.
     * @param {Message} [options.message=JsonMessage] - the type of message to use
     * @param {Number} [options.max_clients=0] - max num of clients, or 0 for no max
     * @param {Number} [options.max_rooms=0] - max num of rooms, or 0 for no max
     * @param {Number} [options.heartbeat=0] - how often to send a heartbeat to UDP clients
	 * @param {ServerListener} [options.server_listener] - the type of server listener to use. If specified
     *                         this will replace the server listener determined by options.type.                          
	 * @param {Function} [options.router] - the router to route requests
	 * @return {Server}
	 */
    constructor({
        host = "localhost",
        port = 3000,
        data_type = "buffer",
        message_type = JsonMessage,
        client_timeout = 0,
        max_clients = 0,
        max_rooms = 0,
        heartbeat = 0,
        server_listener  = null,
        router = new Map()
    }){
        super();
        
        /**
         * Server host.
         * localhost for self, or 127.0.0.1.
         * @type {String}
         */
        this.host = host;

        /**
         * Port to start the server on.
         * @type {Number}
         */
        this.port = port;
        
        /**
         * What the incoming data looks like.
         * buffer or string.
         * @type {String}
         */
        this.data_type = data_type;
        
        /**
         * The type of message to send 
         * and receive between Clients
         * @type {Message}
         */
        this.message_type = message_type;
        
        /**
         * Maximum amount of clients.
         * 0 for no maximum.
         * @type {Number}
         */
        this.max_clients = max_clients;
        
        /**
         * Maximum amount of server rooms.
         * 0 for no maximum.
         * @type {Number}
         */
        this.max_rooms = max_rooms;
        
        /**
         * How long in ms until a client 
         * is considered timed out.
         * 0 for no timeout.
         * @type {Number}
         */
        this.client_timeout = client_timeout;

        /**
         * How often in ms to send a heartbeat to a client.
         * @type {Number}
         */
        this.heartbeat = heartbeat;

        /**
         * An object that listens on a TCP or UDP port
         * for incoming clients.
         * @type {ServerListener}
         */
        this.server_listener = server_listener;
        
        /**
         * Routes requests.
         * @type {Function|Map}
         */
        this.router = router;
        
        // required for buffer based message construction (UDP/TCP)
        this.message_options = {
            // what to append at the end of each message to clients
            // and also what is expected at the end of each message
            eof: this.eof,
            // utf8, etc
            encoding: this.encoding
        };

        /**
         * An object that monitors server stats.
         * @type {ServerMonitor}
         */
        this.monitor = new ServerMonitor();

        /**
         * Log handle.
         * Also used for the context of component loggers.
         * @type {String}
         */
        this.log_handle = `${this.host}:${this.port}`;

        /**
         * Logging object
         * @type {Logger}
         */
        this.logger = new Logger(this.constructor.name, {
            context: this.log_handle,
            level: "debug"
        });

        /**
         * Client manager
         * @type {ClientManager}
         */
        this.client_manager = new ClientManager(this.max_clients);
        
        /**
         * Room manager
         * @type {ObjectManager}
         */
        this.room_manager = new ObjectManager(this.max_rooms);

		//this.client_manager.logger.setContext(this.log_handle);
		//this.room_manager.logger.setContext(this.log_handle);
        
		return this;
    }

	/**
	 * Get the ServerListener
	 * @return {ServerListener}
	 */
	get server_listener(){
		return this._serverListener;
	}
	
	/**
	 * Set the ServerListener.
	 * Validates the ServerListener.
	 * It must have a defined host and port.
	 * Will throw an error if the ServerListener is invalid.
	 * @param {ServerListener} server_listener 
	 */
	set server_listener(server_listener) {
        if(server_listener === null){
            return;
        }
		if(!(server_listener instanceof ServerListener)){
			throw new Error("ServerListener must be instanceof ServerListener");
		}
		if(!server_listener.host){
			throw new Error("ServerListener host is invalid");
		}
		if(isNaN(server_listener.port)){
			throw new Error("ServerListener port is invalid");
		}
		this._serverListener = server_listener;
		//this.server_listener.logger.setContext(this.log_handle);
	}

	/**
	 * Attach handlers to the ServerListener.
	 * The ServerListener should emit "connect" and
	 * "disconnect" events, along with an object
	 * that extends Client, and some possible 
	 * extra data about the initial connection.
	 * @param {ServerListener} server_listener 
	 * @return {Server}
	 */
	attachServerListenerHandlers(server_listener){
		server_listener.on('connect', this.handleClientConnection.bind(this));
		return this;
	}

	/**
	 * Handle a connection from a new Client.
     * Emit a "connect" event with the client.
	 * @param {Client} client 
	 * @param {*} connectData 
	 * @return {Server}
	 */
	handleClientConnection(client, connectData){
		if(!(client instanceof Client)){
			throw new Error("client must be an instanceof Client");
		}

		this.attachClientHandlers(client);
        this.client_manager.add(client.id, client);
        this.emit('connect', client);
		client.ping();
		return this;
	}
    
    /**
     * Attach all handlers to a Client
     * - disconnect
     * - reconnect
     * - timeout
     * - message
     * - error
     * - maxError
     * @param {Client} client 
     * @return {Server}
     */
    attachClientHandlers(client){
		client.on('disconnnect', (data) => {
            this.emit('disconnnect', client, data);
		});
		client.on('reconnnect', () => {
            this.emit('reconnnect', client);
		});
		client.on('timeout', () => {
            this.emit('timeout', client);
		});
		client.on('message', (message) => {
            this.routeMessage(message, client);
            this.emit('message', client, message);
		});
		client.on('error', (error) => {
            this.emit('error', client, error);
		});
        return this;
    }

    /////////////////////////////////////
    // Messages
    /////////////////////////////////////
    
    /**
     * Create a message to send to a client.
     * @param {Object} [options={}] 
     * @return {Message}
     */
    createMessage(options = {}){
        Object.extend(options, this.message_options, options);
        return new this.message_type(options);
    }

    /**
     * Add a route to the router
     * @param {String} route 
     * @param {Function} handler - function to handle the route
     * @return {Server}
     */
    addRoute(route, handler){
        this.router.set(route, handler);
        return this;
    }

    /**
     * Get a route callback from the router
     * @param {String} route 
     * @return {Function}
     */
    getRoute(route){
        return this.router.get(route);
    }

    /**
     * Delete a route from the router.
     * @param {String} route 
     * @return {Server}
     */
    deleteRoute(route){
        this.router.delete(route);
        return this;
    }

    /**
     * Print out all routes
     * @return {Server}
     */
    printRoutes(){
        for(let k in this.router){
            console.log(k);
        }
        return this;
    }

    /**
     * Add the default routes to the router map.
     * @return {Server}
     */
	addDefaultRoutes(){
		this.router.set("/client/whisper", this.handleMessageClientWhisper.bind(this));
		this.router.set("/room/add", this.handleMessageRoomAdd.bind(this));
		this.router.set("/room/delete", this.handleMessageRoomDelete.bind(this));
		this.router.set("/room/empty", this.handleMessageRoomEmpty.bind(this));
		this.router.set("/room/get", this.handleMessageRoomGet.bind(this));
		this.router.set("/room/join", this.handleMessageRoomJoin.bind(this));
		this.router.set("/room/leave", this.handleMessageRoomLeave.bind(this));
		this.router.set("/room/client/ban", this.handleMessageRoomBanClient.bind(this));
		this.router.set("/room/client/get", this.handleMessageRoomGetClients.bind(this));
		this.router.set("/room/client/kick", this.handleMessageRoomKickClient.bind(this));
		return this;
	}

	/**
     * Handle a request to whisper directly to another client.
     * Send the msg to the other client, if found.
	 * Return a Message with the whispered msg or error.
	 * @param {Message} message
	 * @param {Object} message.data
	 * @param {String} message.data.clientId
	 * @param {String} message.data.msg
	 * @param {Client} client
	 * @return {Message}
	 */
	handleMessageClientWhisper(message, client){
        let msg = this.createMessage({route: "/client/whisper"});
		let to_client = this.client_manager.get(message.data.clientId);
		if(to_client){
			msg.setData({
				from: client.id,
				msg: msg.data.msg
			});
            to_client.writeMessage(msg.serialize());
        }
        else {
            msg.setError("Client not found");
		}
		return msg;
	}

	/**
     * Handle a request to add a room.
     * Immediately join the room if it is added.
	 * Return a Message with ok or err.
	 * @param {Message} message
	 * @param {Object} message.data
	 * @param {String} message.data.name
	 * @param {String} [message.data.password]
	 * @param {Boolean} [message.data.private]
	 * @param {Client} client
	 * @return {Message}
	 */
	handleMessageRoomAdd(message, client){
        let msg = this.createMessage({route: "/room/add"});

		// check if room exists
		let room = this.room_manager.get(message.data.name);
		if(room){
			msg.setError("Room already exists");
			return msg;
		}

        message.data.owner = client.id;
		room = new Room(message.data);
		if(room){
            room.add(client.id, client);
            this.room_manager.add(room.name, room);
		}
		else {
			msg.setError("Failed to create room");
		}
		return msg;
	}

	/**
     * Handle a request to delete a room.
	 * Return a Message with ok or err.
	 * @param {Message} message
	 * @param {Object} message.data
	 * @param {String} message.data.name
	 * @param {Client} client
	 * @return {Message}
	 */
	handleMessageRoomDelete(message, client){
        let msg = this.createMessage({route: "/room/delete"});
		let room = this.room_manager.get(message.data.name);
		if(!room){
            msg.setError("Invalid room");
        }
        else if(!room.isOwner(client.id)){
            msg.setError("You are not the father");
        }
		else {
            this.room_manager.delete(message.data.name)
        }
		return msg;
	}

	/**
     * Handle a request to empty a room.
	 * Return a Message with ok or err.
	 * @param {Message} message
	 * @param {Object} message.data
	 * @param {String} message.data.name
	 * @param {Client} client
	 * @return {Message}
	 */
	handleMessageRoomEmpty(message, client){
        let msg = this.createMessage({route: "/room/empty"});
		let room = this.room_manager.get(message.data.name);
		if(!room){
            msg.setError("Invalid room");
        }
        else if(!room.isOwner(client.id)){
            msg.setError("You are not the father");
        }
		else{
			room.empty();
		}
		return msg;
	}

	/**
     * Handle a request to get all rooms.
	 * Return a Message with all rooms.
	 * @param {Message} message
	 * @param {Object} message.data
	 * @param {Number} message.data.index
	 * @param {Number} message.data.max
	 * @param {Client} client
	 * @return {Message}
	 */
	handleMessageRoomGetAll(message, client){
		let rooms = this.room_manager.serialize(message.data.index, message.data.max);
		return this.createMessage({
			route: "/room/get/all",
			data: {rooms: rooms}
		});
	}

	/**
     * Handle a request to get a room.
	 * Return a Message with the room.
	 * @param {Message} message
	 * @param {Object} message.data
	 * @param {String} [message.data.name] - room name if getting single room
	 * @param {Number} [message.data.max=25] - max number of rooms if getting all rooms
	 * @param {Number} [message.data.offset=0] - offset to start at if getting all rooms
	 * @param {Client} client
	 * @return {Message}
	 */
	handleMessageRoomGet(message, client){
        let msg = this.createMessage({route: "/room/get"});

        // get a room by name
        if(message.data && message.data.name){
            let room = this.room_manager.get(message.data.name);
            if(room){
                msg.setData(room.serialize());
            }
            else {
                msg.setError("Invalid room");
            }
        }
        // get all rooms
        else {
            let options = {
                max: 25,
                offset: 0
            };
            Object.assign(options, message.data);
            msg.setData(this.room_manager.serialize(options.max, options.offset));
        }

        return msg;
	}

	/**
     * Handle a request to join a room.
	 * Return a Message with ok or err.
	 * @param {Message} message
	 * @param {Object} message.data
	 * @param {String} message.data.room
	 * @param {String} [message.data.password]
	 * @param {Client} client
	 * @return {Message}
	 */
	handleMessageRoomJoin(message, client){
        let msg = this.createMessage({route: "/room/join"});
		let room = this.room_manager.get(message.data.name);
		if(!room){
            msg.setError("Invalid room");
        }
		else if(!room.join(client, message.data.password)){
            msg.setError("Invalid password");
        }
        return msg;
	}

	/**
     * Handle a request to leave a room.
	 * Return a Message with ok or err.
	 * @param {Message} message
	 * @param {Object} message.data
	 * @param {String} message.data.name
	 * @param {Client} client
	 * @return {Message}
	 */
	handleMessageRoomLeave(message, client){
        let msg = this.createMessage({route: "/room/leave"});
		let room = this.room_manager.get(message.data.name);
		if(!room){
            msg.setError("Invalid room");
        }
		else {
            room.delete(client.id)
        }
		return msg;
	}

	/**
     * Handle a request to ban a client from a room.
	 * Return a Message with ok or err.
	 * @param {Message} message
	 * @param {Object} message.data
	 * @param {String} message.data.name
	 * @param {String} message.data.clientId
	 * @param {String} message.data.msg
	 * @param {Client} client
	 * @return {Message}
	 */
	handleMessageRoomBanClient(message, client){
        let msg = this.createMessage({route: "/room/client/ban"});
        let room = this.room_manager.get(message.data.name);
		if(!room){
            msg.setError("Invalid room");
        }
        else if(!room.isOwner(client.id)){
            msg.setError("You are not the father");
        }
		else{
			room.banClient(message.data.clientId, message.data.msg);
        }
		return msg;
	}

	/**
     * Handle a request to get a room's client list.
	 * Return a Message with the client list.
	 * @param {Message} message
	 * @param {Object} message.data
	 * @param {String} message.data.name
	 * @param {Client} client
	 * @return {Message}
	 */
	handleMessageRoomGetClients(message, client){
        let msg = this.createMessage({route: "/room/client/get"});
		let room = this.room_manager.get(message.data.name);
		if(!room){
            msg.setError("Invalid room");
        }
        else {
            msg.setData(room.client_manager.serialize());
        }
        return msg;
	}

	/**
     * Handle a request to kick a client from a room.
	 * Return a Message with ok or err.
	 * @param {Message} message
	 * @param {Object} message.data
	 * @param {String} message.data.name
	 * @param {String} message.data.clientId
	 * @param {String} message.data.msg
	 * @param {Client} client
	 * @return {Message}
	 */
	handleMessageRoomKickClient(message, client){
        let msg = this.createMessage({route: "/room/client/kick"});
        let room = this.room_manager.get(message.data.name);
		if(!room){
            msg.setError("Invalid room");
        }
        else if(!room.isOwner(client.id)){
            msg.setError("You are not the father");
        }
		else{
			room.kickClient(data.clientId, data.msg);
		}
		return msg;
	}

	/**
	 * Received command router.
	 * @param {Message} message
	 * @param {Client} client
	 * @return {Server}
	 */
	routeMessage(message, client){
        if(message.isDone()){
            return this;
        }
		let route = this.router.get(message.route);
		if(route){
			let response_message = route(message, client);
            if(response_message){
                client.writeMessage(response_message);
            }
		}
		return this;
    }
    
	/**
     * Add default routes.
     * Attach server listener handlers.
	 * Start the server by starting the listener. 
	 * @return {Server}
	 */
	start(){
        this.addDefaultRoutes();
		this.attachServerListenerHandlers(this.server_listener);
        this.monitor.start();
		this.server_listener.listen();
		return this;
	}

	/**
	 * Shut down the server listener
	 * @return {Server}
	 */
	stop(){
		this.client_manager.disconnectClients();
		this.client_manager.empty();
		this.server_listener.close();
        this.monitor.stop();
		return this;
	}
}

module.exports = Server;