const JsonMessage = require('./../json/jsonMessage');
const Message = require('./../message/message');

/**
 * A Message with Buffer based JSON serialization and deserialization.
 * Serializes into a Buffer containing a JSON string.
 * Deserializes from a Buffer containing a JSON string.
 * By default this is encoded in utf8 and the end 
 * of message character is "\r".
 * @extends {JsonMessage}
 */
class BufferJsonMessage extends JsonMessage {

    /**
     * Constructor
     * @param {Object} [options={}] 
     * @param {String} [options.eof="\r"]
     * @param {String} [options.encoding="utf8"]
	 * @param {Number} [options.route=null] - command
	 * @param {Object} [options.data=null] - data
	 * @param {Number} [options.status=Message.status.ok] - status
     * @return {Message}
     */
    constructor({
        eof = "\r", 
        encoding = "utf8",
        route = "",
        data = null,
        status = Message.status.ok
    })
    {
        super({route, data, status});

        /**
         * End of message delimter.
         * @type {String}
         */
        this.eof = eof;

        /**
         * The message encoding
         * @type {String}
         */
        this.encoding = encoding;

        return this;
    }

    /**
     * Convert a Buffer into a string, and then
     * parse the string as JSON. Set Message
     * properties from the resulting object.
     * @param {Buffer} buffer 
     * @return {Message}
     */
    fromJsonBuffer(buffer){
        let string = buffer.toString(this.encoding);
        return this.fromJsonString(string);
    }

    /**
     * Convert the Message into a JSON string 
     * and then convert that into a Buffer.
     * @return {String|Null}
     */
    toJsonBuffer(){
        let string = this.toJsonString();
        if(string){
            string += this.eof;
            return Buffer.from(string, this.encoding);
        }
        return null;
    }

    /**
     * Serialize the Message into a 
     * Buffer containing a JSON string.
     * @return {String|Null}
     */
    serialize(){
        return this.toJsonBuffer();
    }

    /**
     * Deserialize a Buffer containing a 
     * JSON string into the Message.
     * @param {Buffer} data 
     * @return {Message}
     */
    deserialize(data){
        return this.fromJsonBuffer(data);
    }
}

module.exports = BufferJsonMessage;