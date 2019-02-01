const ObjectManager = require('./../util/objectManager');
const Client = require('./client');

/**
 * ClientManager.
 * Manages clients.
 * Keeps track of client stats.
 * Can broadcast to all clients.
 * @extends {ObjectManager}
 */
class ClientManager extends ObjectManager {

	/**
	 * Constructor
	 * @param {object} [options={}]
	 * @param {number} [options.clientTimeout=0]
	 * @param {number} [options.maxClients=0]
	 * @return {ClientManager}
	 */
	constructor(options = {}){
        let defaults = {logHandle: "ClientManager"};
		super(Object.extend(defaults, options));
		this.clientTimeout = options.clientTimeout || 0;
		this.maxObjects = options.maxClients || 0;
        this.bannedList = [];
		// aliases
		this.maxClients = this.maxObjects;
		this.clients = this.objects;
        this.clientCount;
        // stats
        this.peakClients = 0;
        this.totalClients = 0;
		return this;
	}

	/**
	 * Get the client count
	 * @return {number}
	 */
	get clientCount (){
		return this.objectCount;
    }
    
    /**
     * Update the peakClients stat
     * @return {ClientManager}
     */
    updatePeakClients(){
        if(this.clientCount > this.peakClients){
            this.peakClients = this.clientCount;
        }
        return this;
    }

    /**
     * Increment the total clients count
     * @return {ClientManager}
     */
    incrementTotalClients(){
        this.totalClients++;
        return this;
    }

	/**
	 * Add a client.
	 * @param {number|string} id
	 * @param {Client} client
	 * @return {ClientManager}
	 */
    addClient(id, client){
        return this.addObject(id, client);
    }

	/**
	 * Add an array of Clients or an object of clients.
	 * @param {Client[]|object} objects
	 * @return {ObjectManager}
	 */
	addClients(clients){
        return this.addObjects(clients);
	}
	
	/**
	 * Create a Client.
	 * @param {*} socket 
	 * @param {string} [id] - if no id is given, can override other clients
	 * @return {Client}
	 */
	createClient(socket, id){
		let client = new Client(socket, {id});
		this.addClient(id, client);
		return client;
	}

	/**
	 * Get a Client.
	 * @param {Client} client
	 * @return {ClientManager}
	 */
    getClient(id){
        return this.getObject(id);
    }

	/**
	 * Delete a Client.
	 * @param {string} id - client id
	 * @return {ClientManager}
	 */
    deleteClient(id){
        return this.deleteObject(id);
    }

	/**
	 * Kick a client
	 * @param {string} id - client id
	 * @return {ClientManager}
	 */
	kickClient(id){
        this.deleteClient(id);
		return this;
	}

	/**
	 * Ban a client
	 * @param {string} id - client id
	 * @return {ClientManager}
	 */
	banClient(id){
		this.kickClient(id);
		this.bannedList.push(id);
		return this;
	}
    
    /**
     * Attach handlers to a client
     * @param {Client} client 
     * @return {ClientManager}
     */
    attachClientHandlers(client){
        return this;
    }

	/**
	 * Broadcast to all clients
	 * @param {object} msg - msg data
	 * @return {ClientManager}
	 */
	broadcast(msg){
		for(let k in this.clients){
			let client = this.clients[k];
			if(client.write){
				client.write(msg);
			}
		}
		return this;
	}

	/**
	 * Broadcast JSON data to all clients
	 * @param {object} msg - msg data
	 * @return {ClientManager}
	 */
	broadcastJson(msg){
		for(let k in this.clients){
			let client = this.clients[k];
			if(client.writeJson){
				client.writeJson(msg);
			}
		}
		return this;
    }

    ////////////////////////////////////////
    // Object Manager overrides
    ////////////////////////////////////////

	/**
	 * Add a client and update the manager's stats.
	 * @param {number|string} id
	 * @param {Client} client
	 * @return {ClientManager}
	 */
	addObject(id, client){
        if(!(client instanceof Client)){
            this.logger.error("Client is not an instance of Client");
            return this;
        }

        this.attachClientHandlers(client);
        super.addObject(id, client);
        this.updatePeakClients();
        this.incrementTotalClients();
        return this;
    }

	/**
	 * Serialize the client counts.
	 * @return {null|object}
	 */
	serialize(){
		return {
			maxClients: this.maxClients,
			clientCount: this.clientCount
		};
	}
}
module.exports = ClientManager;