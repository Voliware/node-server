const Server = require('../server/server');
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
            name: "TcpServer",
            logHandle: "TcpServer",
            type: "tcp",
            port: options.port,
            message: BufferJsonMessage
        };
        super(Object.extend(defaults, options));
        return this;
    }
}

module.exports = TcpServer;