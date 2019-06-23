const Server = require('../server/server');

/**
 * HTTP Server.
 * A barebones HTTP Server ready to be used.
 * @extends {Server}
 */
class HttpServer extends Server {
   
    /**
     * Constructor
     * @param {object} [options={}]
     * @return {HttpServer}
     */
    constructor(options = {}){
        let defaults = {
            logHandle: "HttpServer",
            type: "http",
            port: options.port
        };
        super(Object.extend(defaults, options));
        return this;
    }

    /**
     * Add the default routes to the router map.
     * This 
     * @return {HttpServer}
     */
	addDefaultRoutes(){
		// this.router.set("/client/whisper", this.handleMessageClientWhisper.bind(this));
		// this.router.set("/room/add", this.handleMessageRoomAdd.bind(this));
		// this.router.set("/room/delete", this.handleMessageRoomDelete.bind(this));
		// this.router.set("/room/empty", this.handleMessageRoomEmpty.bind(this));
		// this.router.set("/room/get", this.handleMessageRoomGet.bind(this));
		// this.router.set("/room/join", this.handleMessageRoomJoin.bind(this));
		// this.router.set("/room/leave", this.handleMessageRoomLeave.bind(this));
		// this.router.set("/room/client/ban", this.handleMessageRoomBanClient.bind(this));
		// this.router.set("/room/client/get", this.handleMessageRoomGetClients.bind(this));
		// this.router.set("/room/client/kick", this.handleMessageRoomKickClient.bind(this));
    }
}

module.exports = HttpServer;