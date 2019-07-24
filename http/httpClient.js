const Client = require('./../client/client');

/**
 * HTTP Client
 * @extends {Client}
 */
class HttpClient extends Client {

    /**
     * Constructor
	 * @param {Socket} socket
	 * @param {object} [options={}]
     * @return {HttpClient}
     */
    constructor(socket, options = {}){
        let defaults = {logHandle: "HttpClient"};
        super(socket, Object.extend(defaults, options));
        this.logger.setLogLevel("debug");
        this.sockets = 0;
        return this;
    }

    incrementSocketCount(socket){
        this.sockets++;
        return this;
    }

    decrementSocketCount(){
        this.sockets--;
        return this;
    }

    checkSocketCount(){
        if(!this.sockets){
            this.emit('disconnected');
            this.logger.info("Disconnected");
        }
        return this;
    }

    /**
     * Attach handlers to the socket.
     * - close
     * - connect
     * - data
     * - drain
     * - end
     * - error
     * - drain
     * - lookup
     * - ready
     * - timeout
     * @param {*} socket
     * @return {Client}
     */ 
    attachSocketHandlers(socket){
        let self = this;
        socket.on('close', function(hadError){
            self.onClose(socket, hadError);
            self.decrementSocketCount();
            self.checkSocketCount();
        });
        socket.on('connect', function(){
            self.onConnect(socket);
        });
        socket.on('data', function(data){
            self.onData(socket, data);
        });
        socket.on('drain', function(){
            self.onDrain(socket);
        });
        socket.on('end', function(){
            self.onEnd(socket);
        });
        socket.on('error', function(error){
            self.onError(socket, error);
        });
        socket.on('lookup', function(error){
            self.onLookup(socket, error, address, family, host);
        });
        socket.on('ready', function(){
            self.onReady(socket);
        });
        socket.on('timeout', function(){
            self.onTimeout(socket);
        });
        return this;
    }

    onClose(socket, hadError){
        this.logger.debug(`Socket[${socket.remotePort}] closed ${hadError ? "with an error"  : ""}`);
        return this;
    }

    onConnect(socket){
        this.logger.debug(`Socket[${socket.remotePort}] connected`);
        return this;
    }

    onData(socket, data){
        this.logger.debug(`Socket[${socket.remotePort}] data`);
        this.logger.debug(data);
        return this;
    }

    onDrain(socket){
        this.logger.debug(`Socket[${socket.remotePort}] drain`);
        return this;
    }

    onEnd(socket){
        this.logger.debug(`Socket[${socket.remotePort}] end`);
        return this;
    }

    onError(socket, error){
        this.logger.debug(`Socket[${socket.remotePort}] error`);
        this.logger.debug(error);
        return this;
    }

    onLookup(socket, error, address, family, host){
        this.logger.debug(`Socket[${socket.remotePort}] lookup`);
        this.logger.debug(error);
        this.logger.debug(`address: ${address}, family: ${family}, host: ${host}`);
        return this;
    }

    onReady(socket){
        this.logger.debug(`Socket[${socket.remotePort}] ready`);
        return this;
    }

    onTimeout(socket){
        this.logger.debug(`Socket[${socket.remotePort}] timeout`);
        return this;
    }

    /**
     * Do not do anything on pings/pongs
     */
    ping(){
        return this;
    }
}

module.exports = HttpClient;