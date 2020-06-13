const Server = require('../server/server');
const BufferJsonMessage = require('./../buffer/bufferJsonMessage');
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
     * @param {Message} [options.message=BufferJsonMessage]
     * @return {TcpServer}
     */
    constructor({
        host = "localhost",
        message = BufferJsonMessage, 
        port = 3333
    })
    {
        super({host, port, message});
        this.server_listener = new TcpServerListener({
            host: this.host,
            port: this.port
        });
        return this;
    }
}

module.exports = TcpServer;