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

		return this;
	}
    
    /**
     * Update the count_peak stat
     * @return {ObjectManager}
     */
    updatePeakCount(){
        if(this.count > this.count_peak){
            this.count_peak = this.count;
        }
        return this;
    }

    /**
     * Increment the count_total state
     * @return {ObjectManager}
     */
    incrementTotal(){
        this.count_total++;
        return this;
    }
    
    /**
     * Callback when objects are added.
     * @param {Object} object 
	 * @return {ObjectManager}
     */
    onAddObject(object){
        return this;
    }
    
    /**
     * Callback when objects are deleted.
     * @param {Object} object 
	 * @return {ObjectManager}
     */
    onDeleteObject(object){
        return this;
    }
    
    /**
     * Callback when objects are updated.
     * @param {Object} object 
	 * @return {ObjectManager}
     */
    onUpdateObject(object){
        return this;
    }

    /**
	 * Add an object if max objects is not reached.
	 * @param {Number|String} id
	 * @param {Object} obj
	 * @return {ObjectManager}
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
		return this;
    }
    
	/**
	 * Add an array or collection of objects
	 * @param {Object|Object[]} objects
	 * @return {ObjectManager}
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
		return this;
    }

	/**
     * Add a single object, an array of objects,
     * or an object of objects. If a collection,
     * interal objects must have an "id" property.
	 * @param {Number|String|Object|Object[]} id - if passing single object, it's id
     *                                             otherwise, array or object of objects
	 * @param {object[]|object} [objects] - if passing a single object, the object
	 * @return {ObjectManager}
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
		return this;
	}

	/**
	 * Delete an object
	 * @param {Number|String} id
	 * @return {ObjectManager}
	 */
	delete(id){
		delete this.objects[id];
        this.logger.info(`Deleted object ${id}`);
        this.count--;
        this.onDeleteObject(id);
		return this;
    }

    /**
     * Delete all objects
	 * @return {ObjectManager}
	 */
    deleteAll(){
        for(let k in this.objects){
            this.delete(k);
        }
        return this;
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
	 * @return {ObjectManager}
	 */
	update(id, obj){
		this.objects[id] = obj;
		this.logger.debug(`Update object ${id}`);
        this.onUpdateObject(obj);
		return this;
	}
    
    /**
     * Remove all objects.
     * Does not call delete on them.
     * @return {ObjectManager}
     */
    empty(){
        this.objects = [];
        this.count = 0;
        return this;
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
	 * @return {object[]}
	 */
	serialize(max = 0, offset = 0){
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
		return {
            count: this.count,
            objects: serialized_objects,
            max: this.max_objects
        };
	}
}

module.exports = ObjectManager;