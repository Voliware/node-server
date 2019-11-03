const EventEmitter = require('events').EventEmitter;
const crypto = require("crypto");
const Logger = require('@voliware/logger');

/**
 * Object Manager.
 * Manages objects.
 * Provides an optional max object limit.
 * Can serialize all objects in the collection,
 * if each object has a serialize() method.
 * Can create new objects if the object constructor is set.
 * Logs all object management in debug mode.
 * @extends {EventEmitter}
 */
class ObjectManager extends EventEmitter {

	/**
	 * Constructor
	 * @param {object} [options={}]
	 * @param {string} [options.logHandle="objectmanager"]
	 * @param {function} [options.objectClass=null]
	 * @param {number} [options.maxObjects=0]
	 * @return {ObjectManager}
	 */
	constructor(options = {}){
        super();
        this.logger = new Logger(options.logHandle || "ObjectManager", {level: "debug"});
		this.maxObjects = options.maxObjects || 0;
		this.objects = {};
		this.objectCount;
		this.objectClass = options.objectClass || null;
		this.requiresNewSerialize = true;
		return this;
	}

	/**
	 * Get the object count
	 * @return {number}
	 */
	get objectCount (){
		return Object.keys(this.objects).length;
    }
    
    /**
     * Create an object from the manager.
     * @return {any}
     */
    createObject(){
        return this.objectClass ? new this.objectClass(...arguments) : {};
    }

	/**
	 * Add an object if max objects is not reached.
	 * @param {number|string} id
	 * @param {object} obj
	 * @return {ObjectManager}
	 */
	addObject(id, obj){
		if(!this.maxObjects || this.objectCount !== this.maxObjects){
			this.objects[id] = obj;
            this.logger.info(`Added object ${id}`);
        }
        else {
            this.logger.info(`Max objects reached (${this.maxObjects})`);
        }
		return this;
	}

	/**
	 * Add an array of objects or an object of objects.
     * They must have an .id property.
	 * @param {object[]|object} objects
	 * @return {ObjectManager}
	 */
	addObjects(objects){
        if(Array.isArray(objects)){
            array.forEach(element => {
                if(typeof element.id !== "undefined"){
                    this.addObject(element.id, element);
                }
            });
        }
        else if(typeof objects === "object") {
            for(let k in objects){
                let obj = objects[k];
                if(typeof obj.id !== "undefined"){
                    this.addObject(obj.id, obj);
                }
            }
        }
		return this;
	}

	/**
	 * Delete an object
	 * @param {number|string} id
	 * @return {ObjectManager}
	 */
	deleteObject(id){
		delete this.objects[id];
        this.logger.info(`Deleted object ${id}`);
		return this;
    }

	/**
	 * Get an object by id
	 * @param {number|string} id
	 * @return {*}
	 */
	getObject(id){
		this.logger.debug(`Get object ${id}`);
		return this.objects[id];
    }
    
    /**
     * Get all objects
     * @return {object}
     */
    getObjects(){
        return this.objects;
    }

	/**
	 * Update an object by replacing it.
	 * @param {number|string} id
	 * @param {object} obj
	 * @return {ObjectManager}
	 */
	updateObject(id, obj){
		this.objects[id] = obj;
		this.logger.debug(`Update object ${id}`);
		return this;
	}
    
    /**
     * Remove all objects
     * @return {ObjectManager}
     */
    empty(){
        this.objects = [];
        return this;
    }
    
    /**
     * Get a random and unique id.
     * Return null if it could not be created.
     * @return {string|null}
     */
    getUniqueRandomId(){
        let id = null;
        let attempts = 0;
        while(attempts < 100){
            id = crypto.randomBytes(8).toString('hex');
            if(typeof this.objects[id] === "undefined"){
                break;
            }
            attempts++;
        }
        return id;
    }

	/**
	 * Serialize all objects that have a serialize method.
	 * @return {object[]}
	 */
	serialize(max = 0, offset = 0){
        let serializedObjects = [];
        for(let k in this.objects){
            // skip until offset
            if(offset > 0){
                offset--;
                continue;
            }

            // serialize object
            let obj = this.objects[k];
			if(obj.serialize){
				serializedObjects.push(obj.serialize());
            }

            // quit at max
            if(max > 0){
                max--;
                if(max === 0){
                    break;
                }
            }
        }
		return serializedObjects;
	}
}

module.exports = ObjectManager;