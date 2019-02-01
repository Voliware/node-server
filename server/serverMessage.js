/**
 * Creates a server message to send to a client.
 * The message is an OK message by default.
 */
class ServerMessage {

	/**
	 * Constructor
	 * @param {object} [options]
	 * @param {number} [options.cmd=null]
	 * @param {object} [options.data=null]
	 * @param {string} [options.msg=null]
	 * @param {number} [options.status=ServerMessage.status.ok]
	 * @return {ServerMessage}
	 */
	constructor(options = {}){
		this.cmd = options.cmd || null;
		this.data = options.data || null;
		this.msg = options.msg || null;
		this.status = options.status || ServerMessage.status.ok;
		return this;
    }

    /**
     * Set the cmd
     * @param {number|string} cmd 
     */
    setCmd(cmd){
        this.cmd = cmd;
        return this;
    }

    /**
     * Set the status
     * @param {number} status 
     */
    setStatus(status){
        this.status = status;
        return this;
    }

    /**
     * Set the msg
     * @param {string} msg 
     */
    setMsg(msg){
        this.msg = msg;
        return this;
    }

    /**
     * Set the data
     * @param {*} data 
     */
    setData(data){
        this.data = data;
        return this;
    }

	/**
	 * Set the message to be an error message
	 * @param {string} [msg] - error message
	 * @return {ServerMessage}
	 */
	setError(msg){
		this.status = ServerMessage.status.error;
		this.msg = msg ? msg : null;
		return this;
	}

	/**
	 * Set the message to be an ok message
	 * @return {ServerMessage}
	 */
	setOk(){
		this.status = ServerMessage.status.ok;
		return this;
	}

	/**
	 * Serialize the message
	 * @return {object}
	 */
	serialize(){
		let serialized = {
			status: this.status
		};

		if(this.cmd !== null){
			serialized.cmd = this.cmd;
		}
		if(this.data !== null){
			serialized.data = this.data;
		}
		if(this.msg !== null){
			serialized.msg = this.msg;
		}
		
		return serialized;
	}
}
ServerMessage.status = {
	error: 0,
	ok: 1
};

module.exports = ServerMessage;