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
     * @param {Object} [options={}]
     * @param {String} [options.host="localhost"]
     * @param {Number} [options.port=4444]
     * @return {UdpServer}
     */
    constructor({
        host = "localhost",
        port = 4444
    })
    {
        super({host, port});
        this.server_listener = new UdpServerListener({
            host: this.host, 
            port: this.port
        });
        // todo: this needs to be done in a more intuitive way
        this.server_listener.setClientManager(this.client_manager);
    }
}

module.exports = UdpServer;