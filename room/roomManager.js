const ObjectManager = require('./../util/objectManager');
const Room = require('./room');

/**
 * Manages rooms
 * @extends {ObjectManager}
 */
class RoomManager extends ObjectManager {

	/**
	 * Constructor
	 * @param {object} [options={}]
	 * @param {Room} [options.objectClass=Room]
	 * @param {number} [options.maxRooms=0]
	 * @param {string} [options.logHandle]
	 * @return {RoomManager}
	 */
	constructor(options = {}){
        let defaults = {
            logHandle: "RoomManager",
            objectClass: Room
        };
		super(Object.extend(defaults, options));
		this.maxObjects = options.maxRooms || 0;
		// aliases
		this.rooms = this.objects;
		this.roomCount;
		return this;
	}

	/**
	 * Attach handlers to a room
	 * @param {Room} room
	 * @return {RoomManager}
	 */
	attachRoomHandlers(room){
		let self = this;
		room.on('destroy', function(){
			self.deleteRoom(room.name);
		});
		return this;
	}

	// wrappers

	/**
	 * Get the rooms count
	 * @return {number}
	 */
	get roomCount (){
		return this.objectCount;
	}

	/**
	 * Add a room
	 * @param {number|string} id
	 * @param {Room} room
	 * @return {RoomManager}
	 */
	addRoom(id, room){
		return this.addObject(id, room);
    }
    
    /**
     * Create a room 
     * @param {object} options 
     * @return {Room}
     */
    createRoom(options){
        return this.createObject(options);
    }

	/**
	 * Delete a room
	 * @param {number|string} id
	 * @return {Room|null}
	 */
	deleteRoom(id){
		return this.deleteObject(id);
	}

	/**
	 * Get a room
	 * @param {number|string} id
	 * @return {Room|null}
	 */
	getRoom(id){
		return this.getObject(id);
    }
    
    /**
     * Get all rooms
     * @return {object}
     */
    getRooms(){
        return this.getObjects();
    }

	/**
	 * Update a room
	 * @param {Room} room
	 * @param {number|string} id
	 * @return {RoomManager}
	 */
	updateRoom(id, room){
		return this.updateObject(id, room);
    }
}

RoomManager.cmd = {
    getRooms: 200,
    getRoom: 201
}

module.exports = RoomManager;