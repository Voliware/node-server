const ObjectManager = require('./../util/objectManager');
const Client = require('./client');

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
	}

	/**
	 * Disconnect all Clients.
	 */
    disconnectClients(){
		for(let k in this.clients){
			this.clients[k].disconnect();
		}
    }

	/**
	 * Ban a client
	 * @param {String} id - client id
	 */
	ban(id){
		this.delete(id);
		this.banned_list.push(id);
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
	 */
	broadcast(message){
		for(let k in this.clients){
			let client = this.clients[k];
			client.write(message);
		}
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