const ServerListener = require('../server/serverListener');
const http = require('http');
const https = require('https');

/**
 * HTTP server listener
 * @extends {ServerListener}
 */
class HttpServerListener extends ServerListener {

	/**
	 * Constructor
	 * @param {object} [options]
	 * @return {HttpServerListener}
	 */
	constructor(options){
        let defaults = {name: "HttpServerListener"};
		super(Object.extend(defaults, options));
		return this;
	}

	/**
	 * Create a TCP server and listen
	 * for incoming connections.
	 */
	listen(){
		this.createHttpServer();
		this.logger.info(`Listening on ${this.host} port ${this.port}`);
	}

	/**
	 * Create a HTTP server and start listening.
	 * Create and emit a HttpClient via the connect event.
	 * @return {HttpServerListener}
	 */
	createHttpServer(){
                
        const server = http.createServer((req, res) => {
            router.lookup(req, res)
        })
        
        server.listen(3000, err => {
            if (err) throw err
            console.log('Server listening on: http://localost:3000')
        })
		return this;
    }

	/**
	 * Create a HTTP server and start listening.
	 * Create and emit a HttpClient via the connect event.
	 * @return {HttpServerListener}
	 */
	createHttpsServer(){
		return this;
    }
}

module.exports = HttpServerListener;