const EventEmitter = require('events').EventEmitter;
const ServerMessage = require ('./serverMessage');
const ServerListener = require ('./serverListener');
const Client = require('./../client/client');
const ClientManager = require('./../client/clientManager');
const RoomManager = require('./../room/roomManager');
const Logger = require('./../util/logger');

/**
 * Generic Server with Client and Room management.
 * Requires a ServerListener that listens on some protocol
 * for connections and disconnection. On each connection,
 * the ServerListener should emit a "connect" event, along
 * with the appropriate Client.
 * @extends {EventEmitter}
 */
class Server extends EventEmitter {

	/**
	 * Constructor
	 * @param {object} options
	 * @param {ServerListener} options.serverListener
	 * @param {string} [options.name="server"]
	 * @param {string} [options.logHandle]
	 * @param {string} [options.clientManagerOptions]
	 * @param {string} [options.roomManagerOptions]
	 * @return {Server}
	 */
	constructor(options){
		super();

		// properties
		this._serverListener = options.serverListener || null;
		this.name = options.name || "Server";
		this.port;
		this.host;

        // components
        this.logger = new Logger(options.logHandle || this.name, this);
		this.clientManager = this.createClientManager(options.clientManagerOptions);
		this.roomManager = this.createRoomManager(options.roomManagerOptions);

		// set the log handle of each component to the same name of the server
		this._serverListener.logger.setLogHandle(this.logger.name, this._serverListener);
		this.clientManager.logger.setLogHandle(this.logger.name, this.clientManager);
		this.roomManager.logger.setLogHandle(this.logger.name, this.roomManager);

		// handlers
		this.attachServerListenerHandlers(this._serverListener);
		this.attachClientManagerHandlers(this.clientManager);
		this.attachRoomManagerHandlers(this.roomManager);
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
	 */
	get port(){
		return this.serverListener.port;
	}

	/**
	 * Get the host
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
		client.on('data', function(data){
			self.routeMessage(client, data);
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
    // Room Commands and Messages
    /////////////////////////////////////

	/**
     * Handle a request to get all rooms.
	 * Return a ServerMessage with all rooms.
	 * @param {object} data
	 * @param {number} data.index
	 * @param {number} data.max
	 * @return {ServerMessage}
	 */
	handleRequestRoomGetAll(data){
		let rooms = this.roomManager.serialize(data.index, data.max);
		return new ServerMessage({
			cmd: Server.cmd.room.getAll,
			data: {rooms: rooms}
		});
	}

	/**
     * Handle a request to get a room.
	 * Return a ServerMessage with the room.
	 * @param {object} data
	 * @param {string} data.room
	 * @return {ServerMessage}
	 */
	handleRequestRoomGet(data){
        let msg = new ServerMessage({cmd: Server.cmd.room.get});
		let room = this.roomManager.getRoom(data.room);
		if(!room){
            msg.setError("Invalid room");
        }
        else {
            room.setData(room.serialize());
        }
        return msg;
	}

	/**
     * Handle a request to get a room's client list.
	 * Return a ServerMessage with the client list.
	 * @param {object} data
	 * @param {string} data.room
	 * @return {ServerMessage}
	 */
	handleRequestRoomGetClient(data){
        let msg = new ServerMessage({cmd: Server.cmd.room.get});
		let room = this.roomManager.getRoom(data.room);
		if(!room){
            msg.setError("Invalid room");
        }
        else {
            room.setData(room.clientManager.serialize());
        }
        return msg;
	}

	/**
     * Handle a request to create a room.
     * Immediately join the room if it is created.
	 * Return a ServerMessage with ok or err.
	 * @param {object} data
	 * @param {string} data.room
	 * @param {string} [data.password]
	 * @param {boolean} [data.private]
	 * @return {ServerMessage}
	 */
	handleRequestRoomCreate(data){
        let msg = new ServerMessage({cmd: Server.cmd.room.create});
		let room = this.roomManager.getRoom(data.room);

		if(!room){
			data.owner = client.id;
			room = this.roomManager.create(data);
			if(room){
				msg = this.roomJoin(data);
            }
            else {
                msg.setError("Failed to create room");
            }
		}
		else {
			msg.setError("Room already exists");
		}
		return msg;
	}

	/**
     * Handle a request to join a room.
	 * Return a ServerMessage with ok or err.
	 * @param {object} data
	 * @param {string} data.room
	 * @param {string} [data.password]
	 * @param {Client} client
	 * @return {ServerMessage}
	 */
	handleRequestRoomJoin(data, client){
        let msg = new ServerMessage({cmd: Server.cmd.room.join});
		let room = this.roomManager.getRoom(data.room);
		if(!room){
            msg.setError("Invalid room");
        }
		else if(!room.join(client, data.password)){
            msg.setError("Invalid password");
        }
        return msg;
	}

	/**
     * Handle a request to leave a room.
	 * Return a ServerMessage with ok or err.
	 * @param {object} data
	 * @param {string} data.room
	 * @param {Client} client
	 * @return {ServerMessage}
	 */
	handleRequestRoomLeave(data, client){
        let msg = new ServerMessage({cmd: Server.cmd.room.leave});
		let room = this.roomManager.getRoom(data.room);
		if(!room){
            msg.setError("Invalid room");
        }
		else {
            room.deleteClient(client.id)
        }
		return msg;
	}

	/**
     * Handle a request to delete a room.
	 * Return a ServerMessage with ok or err.
	 * @param {object} data
	 * @param {string} data.room
	 * @return {ServerMessage}
	 */
	handleRequestRoomDelete(data){
        let msg = new ServerMessage({cmd: Server.cmd.room.delete});
		let room = this.roomManager.getRoom(data.room);
		if(!room){
            msg.setError("Invalid room");
        }
        else if(!room.isOwner(client.id)){
            msg.setError("You are not the father");
        }
		else {
            this.roomManager(data.room)
        }
		return msg;
	}

	/**
     * Handle a request to empty a room.
	 * Return a ServerMessage with ok or err.
	 * @param {object} data
	 * @param {string} data.room
	 * @return {ServerMessage}
	 */
	handleRequestRoomEmpty(data){
        let msg = new ServerMessage({cmd: Server.cmd.room.empty});
		let room = this.roomManager.getRoom(data.room);
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
     * Handle a request to kick a client from a room.
	 * Return a ServerMessage with ok or err.
	 * @param {object} data
	 * @param {string} data.client
	 * @param {string} data.room
	 * @param {string} data.msg
	 * @return {ServerMessage}
	 */
	handleRequestRoomKickClient(data){
        let msg = new ServerMessage({cmd: Server.cmd.room.kickClient});
        let room = this.roomManager.getRoom(data.room);
		if(!room){
            msg.setError("Invalid room");
        }
        else if(!room.isOwner(client.id)){
            msg.setError("You are not the father");
        }
		else{
			room.kickClient(data.client, data.msg);
		}
		return msg;
	}

	/**
     * Handle a request to ban a client from a room.
	 * Return a ServerMessage with ok or err.
	 * @param {object} data
	 * @param {string} data.client
	 * @param {string} data.room
	 * @param {string} data.msg
	 * @return {ServerMessage}
	 */
	handleRequestRoomBanClient(data){
        let msg = new ServerMessage({cmd: Server.cmd.room.banClient});
        let room = this.roomManager.getRoom(data.room);
		if(!room){
            msg.setError("Invalid room");
        }
        else if(!room.isOwner(client.id)){
            msg.setError("You are not the father");
        }
		else{
			room.banClient(data.client, data.msg);
        }
		return msg;
	}

	/**
     * Handle a request to whisper directly to another client.
     * Send the msg to the other client, if found.
	 * Return a ServerMessage with the whispered msg or error.
	 * @param {Client} client
	 * @param {object} data
	 * @param {string} data.msg
	 * @param {string} data.client
	 * @return {ServerMessage}
	 */
	handleRequestClientWhisper(client, data){
        let msg = new ServerMessage({cmd: Server.cmd.client.whisper});
		let toClient = this.clientManager.getClient(data.client);
		if(!toClient){
            msg.setError("Client not found");
        }
        else {
            msg.data = data;
            msg.user = client.id;
            toClient.writeJson(msg.serialize());
		}
		return msg;
    }

	/**
	 * Received command router
	 * @param {Client} client
	 * @param {object} data
	 * @return Server
	 */
	routeMessage(client, data){
		let response = null;
		switch(data.cmd){
			case Server.cmd.room.getAll:
				response = this.handleRequestRoomGetAll(data);
				break;
			// case Server.cmd.room.get:
			// 	response = this.handleRequestRoomGet(data);
			// 	break;
			// case Server.cmd.room.getClients:
			// 	response = this.handleRequestRoomGetClient(data);
			// 	break;
			// case Server.cmd.room.create:
			// 	response = this.handleRequestRoomCreate(data);
			// 	break;
			// case Server.cmd.room.join:
			// 	response = this.handleRequestRoomJoin(data);
			// 	break;
			// case Server.cmd.room.leave:
			// 	response = this.handleRequestRoomLeave(data);
			// 	break;
			// case Server.cmd.room.delete:
			// 	response = this.handleRequestRoomDelete(data);
			// 	break;
			// case Server.cmd.client.whisper:
			// 	response = this.handleRequestClientWhisper(client, data);
			// 	break;
			default:
                this.logger.debug(`Cmd ${data.cmd} not found`);
				break;
		}
		if(response){
			client.writeJson(response.serialize());
		}
		return this;
	}
}
Server.cmd = {
    client: {
        whisper: 1
	},
	room: {
		getAll: 2
	}
};


module.exports = Server;