const Server = require('../server/server');
const UdpServerListener = require('./udpServerListener');
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
            logHandle: "WebSocketServer",
            serverListener: new UdpServerListener({port: options.port}),
            message: {constructor: BufferJsonMessage}
        };
        super(Object.extend(defaults, options));
        this.serverListener.setClientManager(this.clientManager);
        return this;
    }
}

module.exports = UdpServer;