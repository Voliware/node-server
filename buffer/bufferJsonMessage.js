const JsonMessage = require('./../json/jsonMessage');

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
     * @param {object} [options={}] 
     * @param {string} [options.eof="\r"]
     * @param {string} [options.encoding="utf8"]
     * @return {Message}
     */
    constructor(options = {}){
        super(options);
        this.eof = options.eof || "\r";
        this.encoding = options.encoding || "utf8";
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
     * @return {string|null}
     */
    toJsonBuffer(){
        let string = this.toJsonString();
        string += this.eof;
        if(string){
            return Buffer.from(string, this.encoding);
        }
        return null;
    }

    /**
     * Serialize the Message into a 
     * Buffer containing a JSON string.
     * @return {string|null}
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