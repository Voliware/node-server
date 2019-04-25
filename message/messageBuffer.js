/**
 * Buffer for incoming message data.
 */
class MessageBuffer {

    /**
     * Constructor
     * @param {string} type 
     * @param {string} encoding
     * @param {string} eof
     * @return {MessageBuffer}
     */
    constructor(type, encoding, eof){
        this.type = type;
        this.buffer = null;
        this.encoding = encoding;
        this.eof = eof;
        if(this.type === "string"){
            this.append = this.appendString;
        }
        else {
            this.append = this.appendBuffer;
        }
        return this;
    }

    /**
     * Append data to the buffer.
     * This function is actually set during construction.
     * @param {Buffer|string} data
     * @return {MessageBuffer}
     */
    append(data){
        return this;
    }
    
    /**
     * Empty the buffer
     * @return {MessageBuffer}
     */
	empty(){
		this.buffer = null;
		return this;
    }
    
    /**
     * Append data to the buffer.
     * @param {string} buffer
     * @return {MessageBuffer}
     */
    appendString(buffer){
        this.buffer += buffer;
		return this;
    }

    /**
     * Append data to the buffer.
     * @param {Buffer} buffer
     * @return {MessageBuffer}
     */
	appendBuffer(buffer){
        buffer = Buffer.from(buffer, this.encoding);
        if(!this.buffer){
            this.buffer = buffer;
        }
        else {
            this.buffer = Buffer.concat([this.buffer, buffer]);
        }
		return this;
    }

	/**
	 * Split the buffer by splitting the data based on
	 * the buffer EOF identifier, such as "\r" or "<EOF>".
     * If there is leftover data, add it back to the buffer.
     * @return {Buffer[]|string[]} - array of Buffers or strings
	 */
    split(){
        let search = -1;
        let lines = [];
        while((search = this.buffer.indexOf(this.eof)) > -1){
            lines.push(this.buffer.slice(0, search));
            this.buffer = this.buffer.slice(search + this.eof.length, this.buffer.length);
        }
        return lines;
    }
}

module.exports = MessageBuffer;