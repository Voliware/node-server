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
     * @param {HttpServer} [options.http_server=null]
     * @return {WebSocketServer}
     */
    constructor({
        host = "localhost",
        port = 2222,
        http_server = null
    })
    {
        super({host, port});

        // Use the passed HTTP server's listener
        if(http_server){
            this.server_listener = new WebSocketServerListener({http_server});
        }
        // Or create one
        else {
            this.server_listener = new WebSocketServerListener({
                host: this.host,
                port: this.port
            });
        }
    }
}

module.exports = WebSocketServer;