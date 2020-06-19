const Server = require('./../server/server');
const WebSocketServerListener = require('./webSocketServerListener');

/**
 * WebSocket Server.
 * A barebones WebSocket Server ready to be used.
 * @extends {Server}
 */
class WebSocketServer extends Server {

    /**
     * Constructor
     * @param {Object} [options={}]
     * @param {String} [options.host="localhost"]
     * @param {Number} [options.port=2222]
     * @return {WebSocketServer}
     */
    constructor({
        host = "localhost",
        port = 2222
    })
    {
        super({host, port});
        this.server_listener = new WebSocketServerListener({
            host: this.host,
            port: this.port
        });
    }
}

module.exports = WebSocketServer;