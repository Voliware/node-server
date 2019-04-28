const Server = require('./../server/server');
const JsonMessage = require('./../json/jsonMessage');

/**
 * WebSocket Server.
 * A barebones WebSocket Server ready to be used.
 * @extends {Server}
 */
class WebSocketServer extends Server {

    /**
     * Constructor
     * @param {object} [options={}]
     * @return {WebSocketServer}
     */
    constructor(options = {}){
        let defaults = {
            logHandle: "WebSocketServer",
            type: "websocket",
            port: options.port,
            message: JsonMessage
        };
        super(Object.extend(defaults, options));
        return this;
    }
}

// example client on the browser
// let ws = new WebSocket("ws://localhost:1234");
// ws.send(JSON.stringify({route:"/ping"}));

module.exports = WebSocketServer;