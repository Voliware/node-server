const Fs = require('fs');
const Http = require('http');
const Https = require('https');
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
	 * @param {String} [options.cert_bundle_path='sslcert/server.ca']
	 * @param {String} [options.private_key_path='sslcert/server.key']
	 * @return {HttpServerListener}
	 */
	constructor({
        https = false,
        host = "localhost",
        port = 80,
        certificate_path = "sslcert/server.cert",
        cert_bundle_path = "sslcert/server.ca",
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
         * Certificate bundle path for HTTPS
         * @type {String}
         */
        this.cert_bundle_path = cert_bundle_path;
        
        /**
         * Private key file for HTTPS
         * @type {String}
         */
        this.private_key = null;
        
        /**
         * Certificate file for HTTPS
         */
		this.certificate = null;
        
        /**
         * Certificate bundle file for HTTPS
         */
		this.cert_bundle = null;

		// set certs
        this.setSslCertificateFromFile(this.certificate_path);
        this.setSslPrivateKeyFromFile(this.private_key_path);
        this.setSslCertBundleFromFile(this.cert_bundle_path);
	}

	/**
	 * Set SSL cerficiate a provided path 
	 * @param {String} path
	 */
	setSslCertificateFromFile(path){
        if (Fs.existsSync(path)) {
            this.certificate = Fs.readFileSync(path, 'utf8');
        }
        else {
            this.logger.warning("SSL cert file does not exist");
        }
	}

	/**
	 * Set SSL cerficiate a provided path 
	 * @param {String} path
	 */
	setSslPrivateKeyFromFile(path){
        if (Fs.existsSync(path)) {
            this.private_key = Fs.readFileSync(path, 'utf8');
        }
        else {
            this.logger.warning("SSL key file does not exist");
        }
	}

	/**
	 * Set SSL cerficiate bundle provided path 
	 * @param {String} path
	 */
	setSslCertBundleFromFile(path){
        if (Fs.existsSync(path)) {
            this.cert_bundle = Fs.readFileSync(path, 'utf8');
        }
        else {
            this.logger.warning("SSL bundle file does not exist");
        }
	}

	/**
	 * Attach handlers to the HTTP server
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
	}

	/**
	 * Create an HTTP or HTTPS server and listen
	 * for incoming connections.
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
	}

	/**
	 * Close the server listener
	 */
    close(){
        this.server.close();
    }

	/**
	 * Create an HTTP server.
	 * @param {Object} listener
	 * @return {Server}
	 */
	createHttpServer(listener){
		let server = Http.createServer(listener);
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
		let options = {
			key: this.private_key, 
			cert: this.certificate,
			ca: this.cert_bundle
		};
		let server = Https.createServer(options, listener);
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