const ClientManager = require('./../client/clientManager');

/**
 * A client manager with some extra functionality.
 * Adds the ability to privatize the room, assign ownership
 * @extends {ClientManager}
 */
class Room extends ClientManager {

	/**
	 * Constructor
	 * @param {Object} options
	 * @param {String} [options.owner=""]
	 * @param {Boolean} [options.broadcastLeavers=false]
	 * @param {Number} [options.hidden=0]
	 * @param {String} [options.password=""]
	 * @param {String} [options.name="Room"]
	 * @param {Number} [options.max_objects=0]
	 * @return {Room}
	 */
	constructor({
        owner = "",
        password = "",
        hidden = false,
        name = "Room",
        max_objects = 0
    }){
        super(max_objects);
        
        /**
         * Id of client owning the room.
         * @type {String}
         */
        this.owner = owner;
        
        /**
         * Password to join the room
         * @type {String}
         */
        this.password = password;
        
        /**
         * Whether the room is visible to anyone
         * @type {Boolean}
         */
        this.hidden = hidden;
        
        /**
         * Name of the room
         * @type {String}
         */
        this.name = name;
        
		// temp till i think about name vs id
		this.id = this.name;

        /**
         * Number of messages sent.
         * Also serves as next message id.
         * @type {Number}
         */
		this.message_counter = 0;
        
        this.logger.log_handle += ` (${this.name})`;
    }

	/**
	 * Check password
	 * @param {String} password
	 * @return {Boolean}
	 */
	checkPassword(password){
		return this.password === "" || this.password === password;
	}

	/**
	 * Lock a room
	 * @param {String} password
	 */
	lock(password){
		this.password = password;
	}

	/**
	 * Unlock a room
	 */
	unlock(){
		this.password = "";
	}

	/**
	 * Join a room
	 * @param {Client} client
	 * @param {String} [password=""]
	 * @return {Boolean}
	 */
	join(client, password = ""){
		if(!this.isClientBanned(client.id) && (this.checkPassword(password) || this.isOwner(client.id))){
			this.add(client.id, client);
			// this.broadcast();
            return true;
		}
		return false;
	}

	/**
	 * Checks if a client owns a room
	 * @param {String} owner
	 * @return {Boolean}
	 */
	isOwner(owner){
		return owner === this.owner;
	}

	/**
	 * Hide the room preventing it from being serialized
	 */
	privatize(){
		this.hidden = true;
	}

	/**
	 * Unhide the room allowing it to be serialized
	 */
	deprivatize(){
		this.hidden = false;
	}
    
    /**
     * Attach handlers to a client
     * @param {Client} client 
     */
    attachClientHandlers(client){
        super.attachClientHandlers(client);
        client.on('message', (message) => {
            this.handleMessage(message, client);
        });
        // leaving this here for knowledge:
        // if you create clients and add them to a room,
		// but not the server; 
		// first, its the wrong design
        // second, no one will be handling the error event
        // client.on('error', function(data){
        //     console.log("Room: UNHANDLED CLIENT ERROR EVENT")
        // });
    }
    
    /**
     * Add a client.
	 * Send a msg to the client about the room.
     * Broadcast to everyone else that the client has joined.
     * @param {String} id 
     * @param {Client} client 
     */
    add(id, client){
        super.addObject(id, client);
	}
	
    /**
     * Delete a client.
     * Broadcast that the client is deleted.
     * @param {String} id 
     * @param {Client} client 
     */
	delete(id){
		super.delete(id);
    }
    
    /**
     * Handle a message from a client.
     * @param {*} message 
	 * @param {Client} client
     */
    handleMessage(message, client){
    }

	/**
	 * Convert the room into an object
	 * @return {Object}
	 */
	serialize(max = 0, offset = 0){
        let data = super.serialize(max, offset);
		data.privatized = this.hidden ? 1 : 0;
        data.locked = this.password === "" ? 0 : 1;
        return data;
    }
}

module.exports = Room;