const EventEmitter = require('events').EventEmitter;
const Message = require ('../message/message');
const ServerListener = require ('./serverListener');
const Client = require('./../client/client');
const ClientManager = require('./../client/clientManager');
const RoomManager = require('./../room/roomManager');
const Logger = require('./../util/logger');

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
	 * @param {object} options
	 * @param {ServerListener} options.serverListener
	 * @param {string} [options.name="server"]
	 * @param {string} [options.logHandle]
	 * @param {function} [options.router]
	 * @param {object} [options.clientManagerOptions={}]
	 * @param {object} [options.roomManagerOptions={}]
	 * @param {object} [options.message={}] - message options for the Client
	 * @param {function} [options.message.constructor=Message] - the Message type (constructor)
	 * @param {string} [options.message.type="buffer"] - the type of data the client receives
     * @param {string} [options.message.encoding="utf8"] - rx/tx buffer encoding
	 * @param {string} [options.message.eof="\r"] - rx/tx buffer end of datagram character
	 * @return {Server}
	 */
	constructor(options){
		super();

		// properties
		this.serverListener = options.serverListener || null;
		this.name = options.name || "Server";
		this.port;
		this.host;

		this.clientManagerOptions = options.clientManagerOptions || {};
		this.roomManagerOptions = options.roomManagerOptions || {};

        // components
        this.logger = new Logger(options.logHandle || this.name, this);
		this.clientManager = this.createClientManager(this.clientManagerOptions);
		this.roomManager = this.createRoomManager(this.roomManagerOptions);
		this.router = options.router || new Map();

		// set the log handle of each component to the same name of the server
		this._serverListener.logger.setLogHandle(this.name, this._serverListener);
		this.clientManager.logger.setLogHandle(this.name, this.clientManager);
		this.roomManager.logger.setLogHandle(this.name, this.roomManager);

		// messaging
		if(!options.message){
			options.message = {};
		}
		// these options will be passed to Clients
		// they are not used at all on the server level
		this.messageOptions = {
			constructor: options.message.constructor || Message,
			// these would only apply to UDP/TCP clients
			type: options.message.type || "buffer",
			eof: options.message.eof || "\r",
			encoding: options.message.encoding || 'utf8'
		};

		// handlers
		this.attachServerListenerHandlers(this._serverListener);
		this.attachClientManagerHandlers(this.clientManager);
		this.attachRoomManagerHandlers(this.roomManager);

		// init
		this.addDefaultRoutes();
		return this;
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
	 * Get the port
	 * @return {number} 
	 */
	get port(){
		return this.serverListener.port;
	}

	/**
	 * Get the host
	 * @return {string} 
	 */
	get host(){
		return this.serverListener.host;
	}

	/**
	 * Start the server by starting the listener. 
	 * @return {Server}
	 */
	start(){
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
	 * @param {Client} client 
	 * @param {*} connectData 
	 * @return {Server}
	 */
	handleClientConnection(client, connectData){
		if(!(client instanceof Client)){
			throw new Error("client must be an instanceof Client");
		}

		client.setMessageOptions(this.messageOptions);
		this.attachClientHandlers(client);
		this.clientManager.addClient(client.id, client);
		client.ping();
		return this;
	}
    
    /**
     * Attach handlers to a Client
     * @param {Client} client 
     * @return {Server}
     */
    attachClientHandlers(client){
		let self = this;
		client.on('message', function(message){
			self.routeMessage(message, client);
		});
		client.on('error', function(error){
			self.logger.error("Client error:");
			self.logger.error(error);
		})
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
        let msg = new Message({route: "/client/whisper"});
		let toClient = this.clientManager.getClient(message.data.clientId);
		if(!toClient){
            msg.setError("Client not found");
        }
        else {
			msg.setData({
				from: client.id,
				msg: msg.data.msg
			});
            toClient.writeJson(msg.serialize());
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
        let msg = new Message({route: "/room/add"});

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
        let msg = new Message({route: "/room/delete"});
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
        let msg = new Message({route: "/room/empty"});
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
		return new Message({
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
        let msg = new Message({route: "/room/get"});

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
            let max = isNaN(message.data.max) ? 25 : message.data.max;
            let offset = isNaN(message.data.offset) ? 0 : message.data.offset;
            msg.setData(this.roomManager.serialize(max, offset));
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
        let msg = new Message({route: "/room/join"});
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
        let msg = new Message({route: "/room/leave"});
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
        let msg = new Message({route: "/room/client/ban"});
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
        let msg = new Message({route: "/room/client/get"});
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
        let msg = new Message({route: "/room/client/kick"});
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
		let responseMessage = null;
		let route = this.router.get(message.route);
		if(route){
			responseMessage = route(message, client);
		}
		if(responseMessage){
			client.writeMessage(responseMessage);
		}
		return this;
	}
}

module.exports = Server;