const EventEmitter = require('events').EventEmitter;
const Message = require ('../message/message');
const JsonMessage = require ('../json/jsonMessage');
const ServerListener = require ('./serverListener');
const ServerMonitor = require('./serverMonitor');
const Client = require('./../client/client');
const ClientManager = require('./../client/clientManager');
const RoomManager = require('./../room/roomManager');
const UdpServerListener = require('./../udp/udpServerListener');
const TcpServerListener = require('./../tcp/tcpServerListener');
const HttpServerListener = require('./../http/httpServerListener');
const WebSocketServerListener = require('./../webSocket/webSocketServerListener');
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
	 * @param {object} [options={}]
	 * @param {string} [options.name="Server"] - the name of the server
     * @param {string} [options.host="localhost"] - the host address
     * @param {number} [options.port=3000] - the port to listen on
     * @param {string} [options.type="websocket"] - the server type
     * @param {string} [options.data="buffer"] - for tcp/udp, what format to send/receive data in, ie buffer or string.
     *                 For Websocket, this is not relevant.
     * @param {Message} [options.message=JsonMessage] - the type of message to use
     * @param {number} [options.maxErrors=0] - max num of errors the server can tolerate, or 0 for no max
     * @param {number} [options.maxClients=0] - max num of clients, or 0 for no max
     * @param {number} [options.maxClientErrors=0] - how many errors a client can have before disconnecting it
     * @param {number} [options.maxRooms=0] - max num of rooms, or 0 for no max
     * @param {number} [options.clientTimeout=0] - how long to give a client to respond to a message, 0 for no limit. 
     * @param {number} [options.heartbeat=10000] - how often to send a heartbeat to UDP clients
	 * @param {ServerListener} [options.serverListener] - the type of server listener to use. If specified
     *                         this will replace the server listener determined by options.type.                          
	 * @param {string} [options.logHandle] - the log handle
	 * @param {function} [options.router] - the router to route requests
	 * @return {Server}
	 */
	constructor(options = {}){
        super();
        
        this.options = options;

		// server properties
		this.name = options.name || "Server";
        this.host = options.host || "localhost";
		this.port = options.port || 3000;
        this.type = options.type || "websocket";
        this.data = options.data || "buffer";
        this.message = options.message || JsonMessage;
        this.maxErrors = options.maxErrors || 0;
        this.maxClients = options.maxClients || 0;
        this.maxClientErrors = options.maxClientErrors || 0;
        this.maxRooms = options.maxRooms || 0;
        this.clientTimeout = options.clientTimeout || 0;
        this.heartbeat = options.heartbeat || 1000;

        this.monitor = new ServerMonitor();
        
        // server listener
        // if passed, used passed server listener, 
        // otherwise use options.type to create one
        this.serverListener = options.serverListener || null;
        if(!this.serverListener){
            this.serverListener = this.createServerListener(this.type, {
                host: this.host,
                port: this.port,
                maxErrors: this.maxErrors,
                clientOptions: {
                    message: this.message,
                    data: this.data,
                    encoding: this.encoding,
                    eof: this.eof,
                    heartbeat: this.heartbeat
                }
            });
        }

        // required for buffer based message construction (UDP/TCP)
        this.messageOptions = {
            eof: this.eof,
            encoding: this.encoding
        };

        // components
        this.logger = new Logger(options.logHandle || this.name, {context: this});
		this.clientManager = this.createClientManager({maxClients: this.maxClients});
		this.roomManager = this.createRoomManager({maxRooms: this.maxRooms});
        this.router = options.router || new Map();

		// set the log handle of each component to the same name of the server
		this.serverListener.logger.setName(this.name).setContext(this.serverListener);
		this.clientManager.logger.setName(this.name).setContext(this.clientManager);
		this.roomManager.logger.setName(this.name).setContext(this.roomManager);

		// handlers
		this.attachServerListenerHandlers(this.serverListener);
		this.attachClientManagerHandlers(this.clientManager);
		this.attachRoomManagerHandlers(this.roomManager);

		// init
		this.addDefaultRoutes();
		return this;
    }
    
    /**
     * Create a server listener based on its protocol type.
     * @param {string} type 
     * @param {object} [options={}] 
     * @return {ServerListener|number} - return -1 if type not found
     */
    createServerListener(type, options = {}){
        switch(type){
            case Server.type.udp:
                return new UdpServerListener(options);
            case Server.type.tcp:
                return new TcpServerListener(options);
            case Server.type.http:
            case Server.type.https:
                return new HttpServerListener(options);
            case Server.type.websocket:
                return new WebSocketServerListener(options);
        }
        // return -1 since this.serverListener can be null
        return -1;
    }

	/**
	 * Get the ServerListener
	 * @return {ServerListener}
	 */
	get serverListener(){
		return this._serverListener;
	}
	
	/**
	 * Set the ServerListener.
	 * Validates the ServerListener.
	 * It must have a defined host and port.
	 * Will throw an error if the ServerListener is invalid.
	 * @param {ServerListener} serverListener 
	 */
	set serverListener(serverListener) {
        if(serverListener === null){
            return;
        }
		if(!(serverListener instanceof ServerListener)){
			throw new Error("ServerListener must be instanceof ServerListener");
		}
		if(!serverListener.host){
			throw new Error("ServerListener host is invalid");
		}
		if(isNaN(serverListener.port)){
			throw new Error("ServerListener port is invalid");
		}
		this._serverListener = serverListener;
	}

	/**
	 * Start the server by starting the listener. 
	 * @return {Server}
	 */
	start(){
        this.monitor.start();
		this.serverListener.listen();
		return this;
	}

	/**
	 * Shut down the server listener
	 * @return {Server}
	 */
	stop(){
		this.clientManager.disconnectClients();
		this.clientManager.empty();
		this.serverListener.close();
        this.monitor.stop();
		return this;
	}

	/**
	 * Attach handlers to the ServerListener.
	 * The ServerListener should emit "connect" and
	 * "disconnect" events, along with an object
	 * that extends Client, and some possible 
	 * extra data about the initial connection.
	 * @param {ServerListener} serverListener 
	 * @return {Server}
	 */
	attachServerListenerHandlers(serverListener){
		serverListener.on('connect', this.handleClientConnection.bind(this));
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
        this.clientManager.addClient(client.id, client);
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
		let self = this;
		client.on('disconnnect', function(data){
            self.emit('disconnnect', client, data);
		});
		client.on('reconnnect', function(){
            self.emit('reconnnect', client);
		});
		client.on('timeout', function(){
            self.emit('timeout', client);
		});
		client.on('message', function(message){
            self.routeMessage(message, client);
            self.emit('message', client, message);
		});
		client.on('error', function(error){
            self.emit('error', client, error);
		});
		client.on('maxError', function(error){
            self.emit('maxError', client, error);
		});
        return this;
    }

	/**
	 * Create the client manager
	 * @param {object} [options]
	 * @return {ClientManager}
	 */
	createClientManager(options){
		return new ClientManager(options);
	}

	/**
	 * Attach event handlers to the client manager
	 * @param {ClientManager} clientManager
	 * @return {Server}
	 */
	attachClientManagerHandlers(clientManager){
		return this;
	}

	/**
	 * Create the room manager
	 * @param {object} [options]
	 * @return {RoomManager}
	 */
	createRoomManager(options){
		return new RoomManager(options);
	}

	/**
	 * Attach event handlers to the room manager
	 * @param {RoomManager} roomManager
	 * @return {Server}
	 */
	attachRoomManagerHandlers(roomManager){
		return this;
	}	

    /////////////////////////////////////
    // Messages
    /////////////////////////////////////
    
    /**
     * Create a message to send to a client.
     * @param {object} [options={}] 
     * @return {Message}
     */
    createMessage(options = {}){
        Object.extend(options, this.messageOptions, options);
        return new this.message(options);
    }

    /**
     * Add a route to the router
     * @param {string} route 
     * @param {function} handler - function to handle the route
     * @return {Server}
     */
    addRoute(route, handler){
        this.router.set(route, handler);
        return this;
    }

    /**
     * Get a route callback from the router
     * @param {string} route 
     * @return {function}
     */
    getRoute(route){
        return this.router.get(route);
    }

    /**
     * Delete a route from the router.
     * @param {string} route 
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
	 * @param {object} message.data
	 * @param {string} message.data.clientId
	 * @param {string} message.data.msg
	 * @param {Client} client
	 * @return {Message}
	 */
	handleMessageClientWhisper(message, client){
        let msg = this.createMessage({route: "/client/whisper"});
		let toClient = this.clientManager.getClient(message.data.clientId);
		if(toClient){
			msg.setData({
				from: client.id,
				msg: msg.data.msg
			});
            toClient.writeMessage(msg.serialize());
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
	 * @param {object} message.data
	 * @param {string} message.data.name
	 * @param {string} [message.data.password]
	 * @param {boolean} [message.data.private]
	 * @param {Client} client
	 * @return {Message}
	 */
	handleMessageRoomAdd(message, client){
        let msg = this.createMessage({route: "/room/add"});

		// check if room exists
		let room = this.roomManager.getRoom(message.data.name);
		if(room){
			msg.setError("Room already exists");
			return msg;
		}

        message.data.owner = client.id;
		room = this.roomManager.createRoom(message.data);
		if(room){
            room.addClient(client.id, client);
            this.roomManager.addRoom(room.name, room);
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
	 * @param {object} message.data
	 * @param {string} message.data.name
	 * @param {Client} client
	 * @return {Message}
	 */
	handleMessageRoomDelete(message, client){
        let msg = this.createMessage({route: "/room/delete"});
		let room = this.roomManager.getRoom(message.data.name);
		if(!room){
            msg.setError("Invalid room");
        }
        else if(!room.isOwner(client.id)){
            msg.setError("You are not the father");
        }
		else {
            this.roomManager.deleteRoom(message.data.name)
        }
		return msg;
	}

	/**
     * Handle a request to empty a room.
	 * Return a Message with ok or err.
	 * @param {Message} message
	 * @param {object} message.data
	 * @param {string} message.data.name
	 * @param {Client} client
	 * @return {Message}
	 */
	handleMessageRoomEmpty(message, client){
        let msg = this.createMessage({route: "/room/empty"});
		let room = this.roomManager.getRoom(message.data.name);
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
	 * @param {object} message.data
	 * @param {number} message.data.index
	 * @param {number} message.data.max
	 * @param {Client} client
	 * @return {Message}
	 */
	handleMessageRoomGetAll(message, client){
		let rooms = this.roomManager.serialize(message.data.index, message.data.max);
		return this.createMessage({
			route: "/room/get/all",
			data: {rooms: rooms}
		});
	}

	/**
     * Handle a request to get a room.
	 * Return a Message with the room.
	 * @param {Message} message
	 * @param {object} message.data
	 * @param {string} [message.data.name] - room name if getting single room
	 * @param {number} [message.data.max=25] - max number of rooms if getting all rooms
	 * @param {number} [message.data.offset=0] - offset to start at if getting all rooms
	 * @param {Client} client
	 * @return {Message}
	 */
	handleMessageRoomGet(message, client){
        let msg = this.createMessage({route: "/room/get"});

        // get a room by name
        if(message.data && message.data.name){
            let room = this.roomManager.getRoom(message.data.name);
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
            msg.setData(this.roomManager.serialize(options.max, options.offset));
        }

        return msg;
	}

	/**
     * Handle a request to join a room.
	 * Return a Message with ok or err.
	 * @param {Message} message
	 * @param {object} message.data
	 * @param {string} message.data.room
	 * @param {string} [message.data.password]
	 * @param {Client} client
	 * @return {Message}
	 */
	handleMessageRoomJoin(message, client){
        let msg = this.createMessage({route: "/room/join"});
		let room = this.roomManager.getRoom(message.data.name);
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
	 * @param {object} message.data
	 * @param {string} message.data.name
	 * @param {Client} client
	 * @return {Message}
	 */
	handleMessageRoomLeave(message, client){
        let msg = this.createMessage({route: "/room/leave"});
		let room = this.roomManager.getRoom(message.data.name);
		if(!room){
            msg.setError("Invalid room");
        }
		else {
            room.deleteClient(client.id)
        }
		return msg;
	}

	/**
     * Handle a request to ban a client from a room.
	 * Return a Message with ok or err.
	 * @param {Message} message
	 * @param {object} message.data
	 * @param {string} message.data.name
	 * @param {string} message.data.clientId
	 * @param {string} message.data.msg
	 * @param {Client} client
	 * @return {Message}
	 */
	handleMessageRoomBanClient(message, client){
        let msg = this.createMessage({route: "/room/client/ban"});
        let room = this.roomManager.getRoom(message.data.name);
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
	 * @param {object} message.data
	 * @param {string} message.data.name
	 * @param {Client} client
	 * @return {Message}
	 */
	handleMessageRoomGetClients(message, client){
        let msg = this.createMessage({route: "/room/client/get"});
		let room = this.roomManager.getRoom(message.data.name);
		if(!room){
            msg.setError("Invalid room");
        }
        else {
            msg.setData(room.clientManager.serialize());
        }
        return msg;
	}

	/**
     * Handle a request to kick a client from a room.
	 * Return a Message with ok or err.
	 * @param {Message} message
	 * @param {object} message.data
	 * @param {string} message.data.name
	 * @param {string} message.data.clientId
	 * @param {string} message.data.msg
	 * @param {Client} client
	 * @return {Message}
	 */
	handleMessageRoomKickClient(message, client){
        let msg = this.createMessage({route: "/room/client/kick"});
        let room = this.roomManager.getRoom(message.data.name);
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
			let responseMessage = route(message, client);
            if(responseMessage){
                client.writeMessage(responseMessage);
            }
		}
		return this;
	}
}
Server.type = {
    udp: "udp",
    tcp: "tcp",
    http: "http",
    https: "https",
    websocket: "websocket"
};

module.exports = Server;