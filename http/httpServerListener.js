const fs = require('fs');
const http = require('http');
const https = require('https');
const ServerListener = require('../server/serverListener');
const HttpClient = require('./httpClient');

/**
 * HTTP server listener
 * @extends {ServerListener}
 */
class HttpServerListener extends ServerListener {

	/**
	 * Constructor
	 * @param {Object} [options]
	 * @param {Number} [options.host="localhost"]
	 * @param {Number} [options.port=80]
	 * @param {Boolean} [options.https=false]
	 * @param {String} [options.certificate_path='sslcert/server.cert']
	 * @param {String} [options.private_key_path='sslcert/server.key']
	 * @return {HttpServerListener}
	 */
	constructor({
        https = false,
        host = "localhost",
        port = 80,
        certificate_path = "sslcert/server.cert",
        private_key_path = "sslcert/server.key"
    })
    {
		super({host, port});

        /**
         * Whether or not this is HTTPS
         * @type {Boolean}
         */
        this.https = https;
        
        /**
         * Certificate path for HTTPS
         * @type {String}
         */
        this.certificate_path = certificate_path;
        
        /**
         * Private key path for HTTPS
         * @type {String}
         */
        this.private_key_path = private_key_path;
        
        /**
         * Private key file for HTTPS
         */
        this.private_key = null;
        
        /**
         * Certificate file for HTTPS
         */
		this.certificate = null;

		// set certs
        this.setSslCertificateFromFile(this.certificate_path);
        this.setSslPrivateKeyFromFile(this.private_key_path);
        
		return this;
	}

	/**
	 * Set SSL cerficiate a provided path or from
	 * the path setting that was passed in the constructor.
	 * @param {String} path
	 * @return {HttpServerListener}
	 */
	setSslCertificateFromFile(path){
        if (fs.existsSync(path)) {
            this.certificate = fs.readFileSync(path, 'utf8');
        }
        else {
            this.logger.warning("SSL cert file does not exist");
        }
		return this;
	}

	/**
	 * Set SSL cerficiate a provided path or from
	 * the path setting that was passed in the constructor.
	 * @param {String} path
	 * @return {HttpServerListener}
	 */
	setSslPrivateKeyFromFile(path){
        if (fs.existsSync(path)) {
            this.private_key = fs.readFileSync(path, 'utf8');
        }
        else {
            this.logger.warning("SSL key file does not exist");
        }
		return this;
	}

	/**
	 * Attach handlers to the HTTP server
	 * @return {HttpServerListener}
	 */
	attachHttpServerHandlers(){
		this.server.on('error', (error) => {
			this.logger.error(error);
        });
        this.server.on('connection', (socket) => {
            let client_name = socket.remoteAddress;
			let client = this.client_manager.get(client_name);
			if(client){
				client.attachSocketHandlers(socket);
				client.incrementSocketCount();
			}
			else {
				client = this.createClient(socket);
				this.emit('connect', client);
			}
        });
        this.server.on('request', (request, response) => {
            this.logger.debug(`Requested method: ${request.method} of ${request.url}`);
            this.emit('request', request, response);
        });
		return this;
	}

	/**
	 * Create an HTTP or HTTPS server and listen
	 * for incoming connections.
	 * @return {HttpServerListener}
	 */
	listen(){
		if(this.https === true){
			this.server = this.createHttpsServer(null);
		}
		else {
			this.server = this.createHttpServer(null);
		}
		this.attachHttpServerHandlers();
		this.logger.info(`Listening on ${this.host} port ${this.port}`);
		return this;
	}

	/**
	 * Close the server listener
	 * @return {HttpServerListener}
	 */
    close(){
        this.server.close();
		return this;
    }

	/**
	 * Create an HTTP server.
	 * @param {Object} listener
	 * @return {Server}
	 */
	createHttpServer(listener){
		let server = http.createServer(listener);
		server.listen({
			host: this.host,
			port: this.port
		});
        this.logger.info(`HTTP server started on ${this.host} on port ${this.port}`);
		return server;
	}

	/**
	 * Create an HTTPS server.
	 * Requires that keys are set.
	 * @param {Object} listener
	 * @return {Server}
	 */
	createHttpsServer(listener){
		let server = https.createServer({key: this.private_key, cert: this.certificate}, listener);
		server.listen({
			host: this.host,
			port: this.port
		});
        this.logger.info(`HTTPS server started on ${this.host} on port ${this.port}`);
		return server;
	}

	/**
	 * Create an HttpClient.
	 * @param {Socket} socket 
	 * @return {HttpClient}
	 */
	createClient(socket){
		return new HttpClient(socket, {id: socket.remoteAddress});
	}
}

module.exports = HttpServerListener;