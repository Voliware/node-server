const ClientManager = require('./../client/clientManager');
const Message = require ('../message/message');

/**
 * A client manager with some extra functionality.
 * Adds the ability to privatize the room,
 * assign ownership
 * @extends {ClientManager}
 */
class Room extends ClientManager {

	/**
	 * Constructor
	 * @param {object} options
	 * @param {string} [options.owner=""]
	 * @param {boolean} [options.broadcastLeavers=false]
	 * @param {number} [options.private=0]
	 * @param {string} [options.password=""]
	 * @param {string} [options.name="Room"]
	 * @return {Room}
	 */
	constructor(options = {}){
		super(options);
		this.owner = options.owner || "";
		this.password = options.password || "";
		this.private = options.private || false;
        this.name = options.name || "Room";
		this.logger.logHandle += ` (${this.name})`;
		// temp till i think about name vs id
		this.id = this.name;

		// used for generating unique message ids
		this.lastMessageTime = 0;
        this.lastMessageTimeCounter = 0;
        
        this.router = new Map();

		return this;
    }

	/**
	 * Check password
	 * @param {string} password
	 * @return {boolean}
	 */
	checkPassword(password){
		return this.settings.password === "" || this.settings.password === password;
	}

	/**
	 * Lock a room
	 * @param {string} password
	 * @return {Room}
	 */
	lock(password){
		this.settings.password = password;
		return this;
	}

	/**
	 * Unlock a room
	 * @return {Room}
	 */
	unlock(){
		this.settings.password = "";
		return this;
	}

	/**
	 * Join a room
	 * @param {Client} client
	 * @param {string} [password=""]
	 * @return {boolean}
	 */
	join(client, password = ""){
		if(!this.isClientBanned(client.id) && this.checkPassword(password)){
			this.addClient(client.id, client);
			// this.broadcast();
            return true;
		}
		return false;
	}

	/**
	 * Checks if a client owns a room
	 * @param {string} owner
	 * @return {boolean}
	 */
	isOwner(owner){
		return owner === this.owner;
	}

	/**
	 * Hide the room preventing
	 * it from being serialized
	 * @return {Room}
	 */
	privatize(){
		this.private = true;
		return this;
	}

	/**
	 * Unhide the room allowing 
	 * it to be serialized
	 * @return {Room}
	 */
	deprivatize(){
		this.private = false;
		return this;
	}

	/**
	 * Convert the room into an object
	 * @return {null|object}
	 */
	serialize(){
		return {
			maxClients: this.maxClients,
			clientCount: this.clientCount,
			clients: this.serializeClients(),
            privatized: this.private ? 1 : 0,
			locked: this.password === "" ? 0 : 1,
			name: this.name,
			id: this.id
		};
    }
    
    /**
     * Attach handlers to a client
     * @param {Client} client 
     * @return {ClientManager}
     */
    attachClientHandlers(client){
        super.attachClientHandlers(client);
        let self = this;
        client.on('message', function(message){
            self.routeMessage(message, client);
        });
        // leaving this here for knowledge:
        // if you create clients and add them to a room,
		// but not the server; 
		// first, its the wrong design
        // second, no one will be handling the error event
        // client.on('error', function(data){
        //     console.log("Room: UNHANDLED CLIENT ERROR EVENT")
        // });
        return this;
    }
    
    /**
     * Add a client.
	 * Send a msg to the client about the room.
     * Broadcast to everyone else that the client has joined.
     * @param {string} id 
     * @param {Client} client 
     */
    addClient(id, client){
        super.addObject(id, client);
        // client.writeJson({
        //     route: Room.cmd.info,
        //     data: this.serialize()
		// });
		// this.broadcastJson({
		// 	route: Room.cmd.client.add,
		// 	data: {
		// 		id: id,
		// 		name: client.name
		// 	}
		// });
        return this;
	}
	
    /**
     * Delete a client.
     * Broadcast that the client is deleted.
     * @param {string} id 
     * @param {Client} client 
     */
	deleteClient(id){
		super.deleteClient(id);
		// this.broadcastJson({
		// 	route: Room.cmd.client.delete,
		// 	data: {
		// 		id: id
		// 	}
		// });
	}

    /////////////////////////////////////
    // Messages
	/////////////////////////////////////

    /**
     * Add the default routes to the router map.
     * @return {Server}
     */
	addDefaultRoutes(){
		this.router.set("/broadcast", this.handleMessageBroadcast.bind(this));
		this.router.set("/deprivatize", this.handleMessageDeprivatize.bind(this));
		this.router.set("/lock", this.handleMessageLock.bind(this));
		this.router.set("/privatize", this.handleMessagePrivatize.bind(this));
		this.router.set("/unlock", this.handleMessageUnlock.bind(this));
		return this;
	}

	/**
     * Handle a request to broadcast a message to a room.
     * If successful, will broadcast to everyone including the client.
	 * Return a Message with ok or err.
	 * @param {Message} message
	 * @param {string} message.text
     * @param {Client} client
	 * @return {Message}
	 */
	handleMessageBroadcast(message, client){
		let time = Date.now();
        let msg = new Message({
            route: "/broadcast",
            data: {
                text: message.text,
                user: client.name,
				time: time,
				id: this.generateMessageId(client.id, time)
            }
        });
        // this.broadcastJson(msg.serialize());
		return msg;
	}
    
	/**
     * Handle a request to deprivatize the room.
	 * Return a Message with ok or err.
	 * @param {Message} message
	 * @param {Client} client
	 * @return {Message}
	 */
	handleMessageDeprivatize(message, client){
        let msg = new Message({route: "/deprivatize"});
        if(this.isOwner(client.id)){
			this.deprivatize();
        }
		else{
            msg.setError("You do not own this room");
		}
		return msg;
	}
    
	/**
     * Handle a request to lock a room.
	 * Return a Message with ok or err.
     * @param {Message} message
	 * @param {string} message.password
	 * @param {Client} client
	 * @return {Message}
	 */
	handleMessageLock(message, client){
        let msg = new Message({route: "/lock"});
        if(this.isOwner(client.id)){
			this.lock(message.password);
        }
		else{
            msg.setError("You do not own this room");
		}
		return msg;
	}
    
	/**
     * Handle a request to privatize the room.
	 * Return a Message with ok or err.
     * @param {Message} message
	 * @param {Client} client
	 * @return {Message}
	 */
	handleMessagePrivatize(message, client){
        let msg = new Message({route: "/privatize"});
        if(this.isOwner(client.id)){
			this.privatize();
        }
		else{
            msg.setError("You do not own this room");
		}
		return msg;
	}
    
	/**
     * Handle a request to unlock a room.
	 * Return a Message with ok or err.
	 * @param {Message} message
	 * @param {Client} client
	 * @return {Message}
	 */
	handleMessageUnlock(message, client){
        let msg = new Message({route: "/unlock"});
        if(this.isOwner(client.id)){
			this.unlock();
        }
		else{
            msg.setError("You do not own this room");
		}
		return msg;
    }

	/**
	 * Received command router
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

module.exports = Room;