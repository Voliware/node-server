const EventEmitter = require('events').EventEmitter;
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
         * "buffer" or "string".
         * @type {String}
         */
        this.data_type = data_type;
        
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

		this.client_manager.logger.options.context = this.log_handle;
		this.room_manager.logger.options.context = this.log_handle;
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
	 */
	attachServerListenerHandlers(server_listener){
		server_listener.on('connect', this.handleClientConnection.bind(this));
	}

	/**
	 * Handle a connection from a new Client.
     * Emit a "connect" event with the client.
	 * @param {Client} client 
	 * @param {*} connectData 
	 */
	handleClientConnection(client, connectData){
		if(!(client instanceof Client)){
			throw new Error("client must be an instanceof Client");
		}

		this.attachClientHandlers(client);
        this.client_manager.add(client.id, client);
        this.emit('connect', client);
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
    }

    /**
     * Write data to a client
     * @param {Client} client 
     * @param {*} data 
     */
    writeToClient(client, data){
        client.write(data);
    }

    /////////////////////////////////////
    // Routing
    /////////////////////////////////////    

    /**
     * Add a route to the router
     * @param {String} route 
     * @param {Function} handler - function to handle the route
     */
    addRoute(route, handler){
        this.router.set(route, handler);
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
     */
    deleteRoute(route){
        this.router.delete(route);
    }

    /**
     * Print out all routes
     */
    printRoutes(){
        for(let k in this.router){
            console.log(k);
        }
    }

    /////////////////////////////////////
    // Room management
    /////////////////////////////////////

    createRoom(client, {
        password = "",
        hidden = false,
        name = `${client.id}'s Room`,
        max_objects = 0
    })
    {
        let owner = client.id
        let room = new Room({owner, password, hidden, name, max_objects});
        this.addRoom(room);
    }

    addRoom(room){        
		if(this.room_manager.get(room.name)){
            return;
        }
        this.room_manager.add(room.name, room);
    }

    deleteRoom(name, client){
        let room = this.room_manager.get(name);
        if(room && room.isOwner(client.id)){
            this.room_manager.delete(room.name);
        }
    }

    emptyRoom(name, client){
        let room = this.room_manager.get(name);
        if(room && room.isOwner(client.id)){
            room.empty();
        }
    }

    getRooms(start, max){
		return this.room_manager.serialize(start, max);
    }

    getRoom(name, client){
        let room = this.room_manager.get(name);
        if(room && (!room.isHidden() || room.isOwner(client.id))){
            return room.serialize();
        }
        return null;
    }

    joinRoom(name, client, password = ""){
        let room = this.room_manager.get(name);
        if(room){
            room.join(client, password);
        }
    }

    leaveRoom(name, client){
        let room = this.room_manager.get(name);
        if(room){
            room.delete(client.id);
        }
    }

    banClient(name, client, client_to_ban){
        let room = this.room_manager.get(name);
        if(room && room.isOwner(client.id)){
            room.ban(client_to_ban);
        }
    }

    kickClient(name, client, client_to_kick){
        let room = this.room_manager.get(name);
        if(room && room.isOwner(client.id)){
            room.delete(client_to_kick);
        }
    }

    lockRoom(name, client){
        let room = this.room_manager.get(name);
        if(room && room.isOwner(client.id)){
            room.lock();
        }
    }

    unlockRoom(name, client){
        let room = this.room_manager.get(name);
        if(room && room.isOwner(client.id)){
            room.unlock();
        }
    }

    privatize(name, client){
        let room = this.room_manager.get(name);
        if(room && room.isOwner(client.id)){
            room.privatize();
        }
    }

    deprivatize(name, client){
        let room = this.room_manager.get(name);
        if(room && room.isOwner(client.id)){
            room.deprivatize();
        }
    }

    /**
     * Route a message to the Server's router.
     * @param {Number|String}
     * @param {*} message 
	 * @param {Client} client
     */
    routeMessage(route, message, client){
		let handler = this.router.get(route);
		if(handler){
			let response = handler(message, client);
            if(response){
                this.write(response);
            }
		}
    }
    
	/**
     * Add default routes.
     * Attach server listener handlers.
	 * Start the server by starting the listener. 
	 */
	start(){
		this.attachServerListenerHandlers(this.server_listener);
        this.monitor.start();
		this.server_listener.listen();
	}

	/**
	 * Shut down the server listener
	 */
	stop(){
		this.server_listener.close();
		this.client_manager.disconnectClients();
		this.client_manager.empty();
        this.monitor.stop();
	}
}

module.exports = Server;