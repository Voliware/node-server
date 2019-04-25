const Server = require('../server/server');
const TcpServerListener = require('./tcpServerListener');
const BufferJsonMessage = require('./../buffer/bufferJsonMessage');

/**
 * TCP Server.
 * A barebones TCP Server ready to be used.
 * @extends {Server}
 */
class TcpServer extends Server {

    /**
     * Constructor
     * @param {object} [options={}]
     * @return {TcpServer}
     */
    constructor(options = {}){
        let defaults = {
            logHandle: "TcpServer",
            serverListener: new TcpServerListener({port: options.port}),
            message: {constructor: BufferJsonMessage}
        };
        super(Object.extend(defaults, options));
        return this;
    }
}

module.exports = TcpServer;