const ObjectManager = require('./../util/objectManager');
const Client = require('./client');
const Message = require ('../message/message');

/**
 * ClientManager.
 * Manages clients.
 * Keeps track of client stats.
 * @extends {ObjectManager}
 */
class ClientManager extends ObjectManager {

	/**
	 * Constructor
	 * @param {Number} [max_objects=0]
	 * @return {ClientManager}
	 */
	constructor(max_objects){
        super(max_objects);
        
        /**
         * Array of banned client ids
         * @type {String[]}
         */
        this.banned_list = [];

        this.logger.setName("ClientManager");

		return this;
	}

	/**
	 * Disconnect all Clients.
	 * @return {ClientManager}
	 */
    disconnectClients(){
		for(let k in this.clients){
			this.clients[k].disconnect();
		}
		return this;
    }

	/**
	 * Ban a client
	 * @param {String} id - client id
	 * @return {ClientManager}
	 */
	banClient(id){
		this.delete(id);
		this.banned_list.push(id);
		return this;
	}

    /**
     * Determine if a client has been banned
     * @param {Number|String} client_id 
     * @return {Boolean}
     */
    isClientBanned(client_id){
        return this.banned_list.indexOf(client_id) > -1;
    }

	/**
	 * Broadcast a message to all clients
	 * @param {Message} message
	 * @return {ClientManager}
	 */
	broadcast(message){
		for(let k in this.clients){
			let client = this.clients[k];
			client.writeMessage(message);
		}
		return this;
	}
	
	/**
	 * Serialize clients into an array
	 * @return {Client[]}
	 */
	serializeClients(){
		let clients = [];
		for(let k in this.clients){
			let client = this.clients[k];
			if(client.serialize){
				clients.push(client.serialize());
			}
		}
		return clients;
	}
}
module.exports = ClientManager;