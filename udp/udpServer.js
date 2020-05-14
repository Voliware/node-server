const Server = require('../server/server');
const BufferJsonMessage = require('./../buffer/bufferJsonMessage');
const UdpServerListener = require('./udpServerListener');

/**
 * UDP Server.
 * A barebones UDP Server ready to be used.
 * @extends {Server}
 */
class UdpServer extends Server {

    /**
     * Constructor
     * @param {Object} [options={}]
     * @return {UdpServer}
     */
    constructor({port = 4444, message = BufferJsonMessage}){
        super({port, message});
        this.server_listener = new UdpServerListener({
            host: this.host, 
            port: this.port
        });
        // todo: this needs to be done in a more intuitive way
        this.server_listener.setClientManager(this.client_manager);
        return this;
    }
}

module.exports = UdpServer;