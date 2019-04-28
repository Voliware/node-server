const Server = require('../server/server');
const BufferJsonMessage = require('./../buffer/bufferJsonMessage');

/**
 * UDP Server.
 * A barebones UDP Server ready to be used.
 * @extends {Server}
 */
class UdpServer extends Server {

    /**
     * Constructor
     * @param {object} [options={}]
     * @return {UdpServer}
     */
    constructor(options = {}){
        let defaults = {
            logHandle: "UdpServer",
            type: "udp",
            port: options.port,
            message: BufferJsonMessage
        };
        super(Object.extend(defaults, options));
        // todo: this needs to be done in a more intuitive way
        this.serverListener.setClientManager(this.clientManager);
        return this;
    }
}

module.exports = UdpServer;