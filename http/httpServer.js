const Server = require('../server/server');
const HttpServerListener = require('./httpServerListener');

/**
 * HTTP Server.
 * A barebones HTTP Server ready to be used.
 * @extends {Server}
 */
class HttpServer extends Server {
   
    /**
     * Constructor
     * @return {HttpServer}
     */
    constructor(){
        super();
        return this;
    }
}

module.exports = HttpServer;