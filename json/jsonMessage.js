const Message = require('../message/message');

/**
 * A Message with JSON serialization and deserialization.
 * Serializes into a JSON string.
 * Deserializes from a JSON string
 * @extends {Message}
 */
class JsonMessage extends Message {

    /**
     * Constructor
     * @param {object} [options] 
     * @return {Message}
     */
    constructor(options){
        super(options);
        return this;
    }

    /**
     * Parse a JSON string into an object,
     * and set all Message properties from
     * that object.
     * @param {string} string 
     * @return {Message}
     */
    fromJsonString(string){
		let obj = null;
		try {
            // console.log(string)
			obj = JSON.parse(string);
		}
		catch(error){
			console.error("fromJsonString: failed to parse JSON");
            // console.error(error);
        }

        if(obj){
            this.fromObject(obj);
        }

        return this;
    }

    /**
     * Convert Message properties into a 
     * simple object, and stringify that
     * object into a JSON string.
     * @return {string|null} - null if it fails
     */
    toJsonString(){
		let obj = this.toObject()
		let string = null;
		try {
			string = JSON.stringify(obj);
		}
		catch(error){
			console.error("toJsonString: failed to stringify JSON");
            //console.error(error);
		}
		return string || null;
    }

    /**
     * Serialize the Message into a JSON string.
     * @return {string|null}
     */
    serialize(){
        return this.toJsonString();
    }

    /**
     * Deserialize a string into the Message.
     * @param {string} data 
     * @return {Message}
     */
    deserialize(data){
        return this.fromJsonString(data);
    }
}

module.exports = JsonMessage;