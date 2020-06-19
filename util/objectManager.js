const EventEmitter = require('events').EventEmitter;
const crypto = require("crypto");
const Logger = require('@voliware/logger');

/**
 * Object Manager.
 * Manages objects.
 * Provides an optional max object limit.
 * Can serialize all objects in the collection,
 * if each object has a serialize() method.
 * Logs all object management in debug mode.
 * @extends {EventEmitter}
 */
class ObjectManager extends EventEmitter {

	/**
	 * Constructor
	 * @param {Number} [max_objects=0]
	 * @return {ObjectManager}
	 */
	constructor(max_objects = 0){
        super();

        /**
         * The maximum number of objects to manage.
         * 0 for no limit.
         * @type {Number}
         */
        this.max_objects = max_objects;
        
        /**
         * The object collection mapped by an id.
         * @type {Object}
         */
        this.objects = {};
        
        /**
         * The current number of objects.
         * @type {Number}
         */
        this.count = 0;

        /**
         * The number of objects that have been
         * added or created in total.
         * @type {Number}
         */
        this.count_total = 0;

        /**
         * The highest number of objects at one time.
         * @type {Number}
         */
        this.count_peak = 0;

        /**
         * Logging object
         * @type {Logger}
         */
        this.logger = new Logger("ObjectManager", {level: "debug"});

	}
    
    /**
     * Update the count_peak stat
     */
    updatePeakCount(){
        if(this.count > this.count_peak){
            this.count_peak = this.count;
        }
    }

    /**
     * Increment the count_total state
     */
    incrementTotal(){
        this.count_total++;
    }
    
    /**
     * Callback when objects are added.
     * @param {Object} object 
     */
    onAddObject(object){
    }
    
    /**
     * Callback when objects are deleted.
     * @param {Object} object 
     */
    onDeleteObject(object){
    }
    
    /**
     * Callback when objects are updated.
     * @param {Object} object 
     */
    onUpdateObject(object){
    }

    /**
	 * Add an object if max objects is not reached.
	 * @param {Number|String} id
	 * @param {Object} obj
	 */
	addOne(id, obj){
		if(!this.max_objects || this.count !== this.max_objects){
			this.objects[id] = obj;
            this.logger.info(`Added object ${id}`);
        }
        else {
            this.logger.info(`Max objects reached (${this.max_objects})`);
        }
        this.count++;
        this.count_total++;
        this.updatePeakCount();
        this.onAddObject(obj);
    }
    
	/**
	 * Add an array or collection of objects
	 * @param {Object|Object[]} objects
	 */
    addMany(objects){
        if(Array.isArray(objects)){
            array.forEach(element => {
                if(typeof element.id !== "undefined"){
                    this.addOne(element.id, element);
                }
            });
        }
        else if(typeof objects === "object") {
            for(let k in objects){
                let obj = objects[k];
                if(typeof obj.id !== "undefined"){
                    this.addOne(obj.id, obj);
                }
            }
        }
    }

	/**
     * Add a single object, an array of objects,
     * or an object of objects. If a collection,
     * interal objects must have an "id" property.
	 * @param {Number|String|Object|Object[]} id - if passing single object, it's id
     *                                             otherwise, array or object of objects
	 * @param {object[]|object} [objects] - if passing a single object, the object
     * @example 
     * add(554, {});
     * add([{id:1},..]);
     * add({a: {id:1},...});
	 */
	add(){
        if(typeof arguments[0] === "number" || typeof arguments[0] === "string"){
            this.addOne(...arguments);
        }
        else {
            this.addMany(...arguments);
        }
	}

	/**
	 * Delete an object
	 * @param {Number|String} id
	 */
	delete(id){
		delete this.objects[id];
        this.logger.info(`Deleted object ${id}`);
        this.count--;
        this.onDeleteObject(id);
    }

    /**
     * Delete all objects
	 */
    deleteAll(){
        for(let k in this.objects){
            this.delete(k);
        }
    }

	/**
	 * Get an object by id
	 * @param {Number|String} id
	 * @return {*}
	 */
	getOne(id){
		this.logger.debug(`Get object ${id}`);
		return this.objects[id];
    }
    
    /**
     * Get all objects
     * @return {Object}
     */
    getAll(){
        return this.objects;
    }

    /**
     * Get one or all objects.
     * If no id is passed, gets all objects.
     * If any id is passed, tries to get that object.
     * @param {Number|String} [id]
     * @return {Object}
     */
    get(id){
        return typeof id === "undefined" ? this.getAll() : this.getOne(id);
    }

	/**
	 * Update an object by replacing it.
	 * @param {Number|String} id
	 * @param {Object} obj
	 */
	update(id, obj){
		this.objects[id] = obj;
		this.logger.debug(`Update object ${id}`);
        this.onUpdateObject(obj);
	}
    
    /**
     * Remove all objects.
     * Does not call delete on them.
     */
    empty(){
        this.objects = [];
        this.count = 0;
    }
    
    /**
     * Get a random and unique id.
     * Return null if it could not be created.
     * @return {String|Null}
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
	 * @return {Object[]}
	 */
    serializeObjects(max = 0, offset = 0){
        let serialized_objects = [];
        for(let k in this.objects){
            // skip until offset
            if(offset > 0){
                offset--;
                continue;
            }

            // serialize object
            let obj = this.objects[k];
			if(obj.serialize){
				serialized_objects.push(obj.serialize());
            }

            // quit at max
            if(max > 0){
                max--;
                if(max === 0){
                    break;
                }
            }
        }
        return serialized_objects;
    }

	/**
	 * Serialize the object mananger.
	 * @return {Object}
	 */
	serialize(max = 0, offset = 0){
		return {
            count: this.count,
            objects: this.serializeObjects(max, offset),
            max: this.max_objects
        };
	}
}

module.exports = ObjectManager;