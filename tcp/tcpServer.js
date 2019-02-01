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
     * @return {TcpServer}
     */
    constructor(options){
        super({
            logHandle: "TcpServer",
            serverListener: new TcpServerListener({port: options.port})
        });
        return this;
    }
}

module.exports = TcpServer;