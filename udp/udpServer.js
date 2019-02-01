const Server = require('../server/server');
const UdpServerListener = require('./udpServerListener');

/**
 * UDP Server.
 * A barebones UDP Server ready to be used.
 * @extends {Server}
 */
class UdpServer extends Server {

    /**
     * Constructor
     * @return {UdpServer}
     */
    constructor(options){
        super({
            logHandle: "UdpServer",
            serverListener: new UdpServerListener({port: options.port})
        });
        this.serverListener.setClientManager(this.clientManager);
        return this;
    }
}

module.exports = UdpServer;