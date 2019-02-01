const Socket = require('net').Socket;
const Client = require('../client/client');
const util = require('../util/util');
const isString = util.isString;

/**
 * UDP Client
 * @extends {Client}
 */
class UdpClient extends Client {

	/**
	 * Constructor
	 * @param {Socket} socket
	 * @param {object} [options={}]
	 * @return {UdpClient}
	 */
	constructor(socket, options={}){
        let defaults = {logHandle: "UdpClient"};
        super(socket, Object.extend(defaults, options));

		// buffer
		// this.bufferSize = 1024;
		// this.buffer = Buffer.alloc(this.bufferSize);
		// // <EOF>
		// this.bufferEnd = Buffer.from([0x3c, 0x45, 0x4f, 0x46, 0x3e]);

		return this;
	}

    /**
     * Get the address of the socket,
     * such as 127.0.0.1, or localhost
     * @return {string}
     */
    getSocketAddress(){
		if(this.socket){
			return this.socket.remoteAddress;
		}
    }

    /**
     * Get the port of the socket,
     * probably between 1 to 65535
     * @return {string}
     */
    getSocketPort(){
		if(this.socket){
			return this.socket.remotePort;
		}
    }

	/**
	 * Attach handlers to the socket.
	 * @param {Socket} socket 
	 * @return {UdpClient}
	 */
	attachSocketHandlers(socket){		
		let self = this;
		// build up buffer
		// this.socket.on('data', function(data){
		// 	let dataBuffer = Buffer.from(data);
		// 	self._concatBuffer(dataBuffer);
		// 	if(self._isEndOfData()){
		// 		self._emitDataReady();
		// 	}
		// });
		socket.on('data', function(data){
			

			try{
				let json = JSON.parse(data);
				self.emit('data', json);
			}
			catch(e) {
				let msg = data.toString('utf8');
                if(msg === "ping"){
					self.logger.info('UdpClient ping');
					self.emit('ping');
                    self.pong();
                }
                else if(msg === "pong"){
                    self.logger.info('UdpClient pong');
					self.emit('pong');
                    self.recordLatency();
                }
                else {
                    self.logger.warn('Data is not json or ping');
                    self.logger.error(e);
					self.emit('error', e);
                }
			}
		});
		socket.on('error', function(){
			self.logger.error("Socket error:");
			self.logger.error(error);
			self.emit('error', error);
			self.errorCount++;
			if(self.errorCount >= self.maxErrorCount){
				self.emit('maxError');
			}
		});
		socket.on('timeout', function(){
			self.logger.warn("Socket has timed out");
			self.emit('timeout');
		});
		socket.on('end', function(){
			self.logger.warn("Socket has ended");
			self.emit('disconnect');
		});
		socket.on('close', function(){
			self.logger.warn("Socket has closed");
			self.emit('disconnect');
		});
		return this;
	}

	/**
	 * Write data to the socket.
	 * @param {*} data
	 * @return {*|Number|null} - returns null if it failed
	 */
	write(data){
		// convert objs to JSON
		// append <EOF> to every msg
		data = isString(data) ? data : JSON.stringify(data);
		data += "<EOF>";
		let msg = Buffer.from(data);
		return this.socket.write(msg);
	}

    /**
     * Virtually receive data from the socket.
     * @param {*} data 
     * @param {object} rinfo - connection info, should be the same
     * @return {UdpSocket}
     */
	socketReceive(data, rinfo){
		if(this.socket){
			this.socket.receive(data, rinfo);
		}
		return this;
	}

    /**
     * Ping the web socket
	 * @return {*|Number}
     */
    ping(){
        this.updateLastPingSent();
        return this.write("ping");
    }

    /**
     * Pong the web socket
	 * @return {*|Number}
     */
    pong(){
        return this.write("pong");
    }

	// /**
	//  * Concat a buffer to the local buffer
	//  * if there is enough space.
	//  * @param {Buffer} dataBuffer
	//  * @private
	//  */
	// _concatBuffer(dataBuffer){
	// 	if(this.buffer.length + dataBuffer.length < this.bufferSize){
	// 		this.buffer.concat(dataBuffer);
	// 	}
	// }
	//
	// /**
	//  * Check if the buffer has an end
	//  * of data identifier within it
	//  * @param {Buffer} buffer
	//  * @private
	//  */
	// _isEndOfData(buffer){
	// 	return buffer.includes(this.bufferEnd);
	// }
	//
	// /**
	//  * Emit the ready buffer data as JSON
	//  * @return {Client}
	//  * @private
	//  */
	// _emitDataReady(){
	// 	let data = JSON.parse(this.buffer);
	// 	this.emit('dataReady', data);
	// 	return this;
	// }

	/**
	 * Convert to object
	 * @return {object}
	 */
	serialize(){
		return {
			id : this.id
		}
	}
}

module.exports = UdpClient;