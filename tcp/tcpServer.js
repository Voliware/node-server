const Server = require('../server/server');
const TcpServerListener = require('./tcpServerListener');

/**
 * TCP Server.
 * A barebones TCP Server ready to be used.
 * @extends {Server}
 */
class TcpServer extends Server {

    /**
     * Constructor
     * @param {Object} [options={}]
     * @param {String} [options.host="localhost"]
     * @param {Number} [options.port=3333]
     * @return {TcpServer}
     */
    constructor({
        host = "localhost",
        port = 3333
    })
    {
        super({host, port});
        this.server_listener = new TcpServerListener({
            host: this.host,
            port: this.port
        });
    }
}

module.exports = TcpServer;