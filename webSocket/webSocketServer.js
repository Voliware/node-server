const Server = require('./../server/server');
const JsonMessage = require('./../json/jsonMessage');
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
     * @return {WebSocketServer}
     */
    constructor({message = JsonMessage, port = 443}){
        super({port, message});
        this.server_listener = new WebSocketServerListener({
            host: this.host,
            port: this.port
        });
        return this;
    }
}

module.exports = WebSocketServer;