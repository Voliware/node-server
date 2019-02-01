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
     * @return {WebSocketServer}
     */
    constructor(options){
        super({
            logHandle: "WebSocketServer",
            serverListener: new WebSocketServerListener({port: options.port})
        });
        return this;
    }
}

// example client on the browser
// let ws = new WebSocket("ws://localhost:1234");
// ws.send(JSON.stringify({cmd:0}));

module.exports = WebSocketServer;