/**
 * Creates a message to send to a client,
 * or parses a message from a client.
 * A message can be passed through multiple routers,
 * so it has a status property. This status property
 * starts at ok, and can move to error, or done.
 * This status reflects the outcome of the last router
 * to handle the message. When set to ok, the last router
 * to handle the message encountered no problems, and other
 * routers are free to also handle the message. When in 
 * error, or done, the next router may determine
 * whether or not it should continue. 
 * The message is serialized into a simple object.
 * The message is deserialized from a simple object.
 * This class should be extended if you want to serialize
 * data in some other way, such as JSON, XML, or other.
 */
class Message {

	/**
	 * Constructor
	 * @param {Object} [options]
	 * @param {Number} [options.route=null] - command
	 * @param {Object} [options.data=null] - data
	 * @param {Number} [options.status=Message.status.ok] - status
	 * @return {Message}
	 */
	constructor({
        route = "",
        data = null,
        status = Message.status.ok
    })
    {
        /**
         * The message route.
         * @type {String}
         */
        this.route = route;
        
        /**
         * The message data
         * @type {Object}
         */
        this.data = data;
        
        /**
         * The message status
         * @type {Message.status}
         */
        this.status = status;

        /**
         * The time the message was created in s
         * @type {Number}
         */
		this.timestamp = Date.now();
        
		return this;
	}
	
    /**
     * Set the route
     * @param {Number|String} route 
	 * @return {Message}
     */
    setRoute(route){
        this.route = route;
        return this;
	}
	
	/**
	 * Get the route
	 * @return {Number|String}
	 */
	getRoute(){
		return this.route;
	}

    /**
     * Set the status
     * @param {Number} status 
	 * @return {Message}
     */
    setStatus(status){
        this.status = status;
        return this;
	}
	
	/**
	 * Set the Message status as done.
	 * This can indicate to other handlers
	 * of the message to ignore it.
	 * @return {Message}
	 */
	setDone(){
		this.status = Message.status.done;
		return this;
    }
    
    /**
     * Get whether the message has been fully 
     * processed by a handler, and should no 
     * longer be handled.
     * @return {Boolean}
     */
    isDone(){
        return this.status === Message.status.done;
    }

	/**
	 * Get the status
	 * @return {Number|String}
	 */
	getStatus(){
		return this.status;
	}

    /**
     * Set the data
     * @param {*} data 
	 * @return {Message}
     */
    setData(data){
        this.data = data;
        return this;
    }
	
	/**
	 * Get the data
	 * @return {Number|String}
	 */
	getData(){
		return this.data;
	}

	/**
	 * Set the message to be an error message
	 * @param {String} [text]
	 * @return {Message}
	 */ 
	setError(text){
		this.status = Message.status.error;
		if(text){
			this.setData(text);
		}
		return this;
	}

	/**
	 * Set the message to be an ok message
	 * @return {Message}
	 */
	setOk(){
		this.status = Message.status.ok;
		return this;
	}

	/**
	 * Serialize the message to an object.
	 * If any message properties are null,
	 * they are not included in the object.
	 * @return {Object}
	 */
	toObject(){
		let obj = {
			status: this.status,
			timestamp: this.timestamp
		};

		if(this.route !== null){
			obj.route = this.route;
		}
		if(this.data !== null){
			obj.data = this.data;
		}
		
		return obj;
	}

	/**
	 * Set Message properties from an object.
	 * @param {Object} obj
	 * @param {Number|String} obj.route
	 * @param {Number|String} [obj.status]
	 * @param {*} [obj.data]
	 * @param {Number|String} [obj.timestamp]
	 * @return {Message}
	 */
	fromObject(obj){
		if(typeof obj.route !== "undefined"){
			this.route = obj.route;
		}
		if(typeof obj.status !== "undefined"){
			this.status = obj.status;
		}
		if(typeof obj.data !== "undefined"){
			this.data = obj.data;
		}
		if(typeof obj.timestamp !== "undefined"){
			this.timestamp = obj.timestamp;
		}
		return this;
	}

	/**
	 * Serialize the message into a simple object.
	 * @return {Object}
	 */
	serialize(){
		return this.toObject();
	}

	/**
	 * Deserialize an object of data and 
	 * set matching Message properties.
	 * @param {*} data
	 * @return {Message}
	 */
	deserialize(data){
		return this.fromObject(data);
	}
}
Message.status = {
	error: 0,
	ok: 1,
	done: 2
};

module.exports = Message;