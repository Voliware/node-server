const ClientManager = require('./../client/clientManager');
const ServerMessage = require ('./../server/serverMessage');

/**
 * Generic room for holding clients and broadcasting
 * messages to all of them.
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
		return this;
    }

    /**
     * Determine if a client has been banned
     * @param {number|string} clientId 
     * @return {boolean}
     */
    isClientBanned(clientId){
        return this.bannedList.indexOf(clientId) > -1;
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
			this.broadcastJson
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
	 * Broadcast msg to all clients
	 * @param {object} msg
	 * @param {object} msg.data
	 * @return {Room}
	 */
	broadcast(msg){
		msg.data.room = this.name;
		return super.broadcast(msg);
	}

	/**
	 * Broadcast JSON msg to all clients
	 * @param {object} msg 
	 * @param {object} [msg.data]
	 * @return {Room}
	 */
	broadcastJson(msg){
        if(typeof msg.data === 'undefined'){
            msg.data = {};
        }
		msg.data.room = this.name;
		return super.broadcastJson(msg);
	}
	
	/**
	 * Serialize clients into an array
	 * @return {Client[]}
	 */
	serializeClients(){
		let clients = [];
		for(let k in this.clients){
			let client = this.clients[k];
			clients.push({
				id: client.id,
				name: client.name
			});
		}
		return clients;
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
        client.on('data', function(data){
            self.routeMessage(client, data);
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
        client.writeJson({
            cmd: Room.cmd.info,
            data: this.serialize()
		});
		this.broadcastJson({
			cmd: Room.cmd.client.add,
			data: {
				id: id,
				name: client.name
			}
		});
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
		this.broadcastJson({
			cmd: Room.cmd.client.delete,
			data: {
				id: id
			}
		});
	}

    ////////////////////////////////////////
    // Messaging
	////////////////////////////////////////
	
	/**
	 * Generate a unique message id based on
	 * the time and a client id
	 * @param {string} clientId 
	 * @param {number} time 
	 * @return {string}
	 */
	generateMessageId(clientId, time){
		if(time === this.lastMessageTime){
			time += "_" + this.lastMessageTimeCounter++;
		}
		else {
			this.lastMessageTimeCounter = 0;
		}
		this.lastMessageTime = time;
		return clientId + time;
	}

    ////////////////////////////////////////
    // Request Handlers
	////////////////////////////////////////

	/**
     * Handle a request to broadcast a message to a room.
     * If successful, will broadcast to everyone including the client.
	 * Return a ServerMessage with ok or err.
     * @param {Client} client
	 * @param {object} data
	 * @param {string} data.text
	 * @return {ServerMessage}
	 */
	handleRequestBroadcast(client, data){
		let time = Date.now();
        let msg = new ServerMessage({
            cmd: Room.cmd.client.broadcast,
            data:{
                text: data.text,
                user: client.name,
				time: time,
				id: this.generateMessageId(client.id, time)
            }
        });
        this.broadcastJson(msg.serialize());
		return msg;
	}
    
	/**
     * Handle a request to privatize the room.
	 * Return a ServerMessage with ok or err.
	 * @param {Client} client
	 * @return {ServerMessage}
	 */
	handleRequestPrivatize(client){
        let msg = new ServerMessage({cmd: Room.cmd.privatize});
        if(this.isOwner(client.id)){
			this.privatize();
        }
		else{
            msg.setError("You are not the father");
		}
		return msg;
	}
    
	/**
     * Handle a request to deprivatize the room.
	 * Return a ServerMessage with ok or err.
	 * @param {Client} client
	 * @return {ServerMessage}
	 */
	handleRequestDeprivatize(client){
        let msg = new ServerMessage({cmd: Room.cmd.deprivatize});
        if(this.isOwner(client.id)){
			this.deprivatize();
        }
		else{
            msg.setError("You are not the father");
		}
		return msg;
	}
    
	/**
     * Handle a request to lock a room.
	 * Return a ServerMessage with ok or err.
	 * @param {Client} client
     * @param {object} data
	 * @param {string} data.password
	 * @return {ServerMessage}
	 */
	handleRequestLock(client, data){
        let msg = new ServerMessage({cmd: Room.cmd.lock});
        if(this.isOwner(client.id)){
			this.lock(data.password);
        }
		else{
            msg.setError("You are not the father");
		}
		return msg;
	}
    
	/**
     * Handle a request to unlock a room.
	 * Return a ServerMessage with ok or err.
	 * @param {Client} client
	 * @return {ServerMessage}
	 */
	handleRequestUnlock(client){
        let msg = new ServerMessage({cmd: Room.cmd.unlock});
        if(this.isOwner(client.id)){
			this.unlock();
        }
		else{
            msg.setError("You are not the father");
		}
		return msg;
    }
    
    /**
	 * Route a message sent to the room from a client.
     * @param {Client} client
	 * @param {object} data
	 * @return {Room}
	 */
    routeMessage(client, data){
        this.logger.debug(`Routing cmd ${data.cmd}`);
        
        let response = null;
        switch(data.cmd){
            case Room.cmd.client.add:
                response = this.handleRequestAddClient(data);
                break;
            case Room.cmd.client.delete:
                response = this.handleRequestDeleteClient(data);
                break;
            case Room.cmd.client.deleteAll:
                response = this.handleRequestDeleteClients(data);
                break;
            case Room.cmd.client.get:
                response = this.handleRequestGetClient(data);
                break;
            case Room.cmd.client.getAll:
                response = this.handleRequestGetClients(data);
                break;
            case Room.cmd.client.kick:
                response = this.handleRequestKickClient(data);
                break;
            case Room.cmd.client.ban:
                response = this.handleRequestBanClient(data);
                break;
            case Room.cmd.client.broadcast:
                // this will send a response to the client already
                this.handleRequestBroadcast(client, data);
                break;
            case Room.cmd.privatize:
                response = this.handleRequestPrivatize(data);
                break;
            case Room.cmd.deprivatize:
                response = this.handleRequestDeprivatize(data);
                break;
            case Room.cmd.lock:
                response = this.handleRequestLock(data);
                break;
            case Room.cmd.unlock:
                response = this.handleRequestUnlock(data);
                break;
            default:
                this.logger.info(`Cmd ${data.cmd} not found`);
                response = new ServerMessage({
                    status: ServerMessage.status.error
                });
                break;
        }
        if(response){
            client.writeJson(response.serialize());
        }
		return this;
    }
    
}
Room.cmd = {
    client: {
        add: 100,
        delete: 101,
        deleteAll: 102,
        get: 103,
        getAll: 104,
        kick: 105,
        ban: 106,
        broadcast: 107
    },
    privatize: 108,
    deprivatize: 109,
    lock: 110,
	unlock: 111,
	info: 112
};
module.exports = Room;