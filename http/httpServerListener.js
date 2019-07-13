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
	 * @param {object} [options]
	 * @param {string} [options.host='localhost']
	 * @param {number} [options.port=80]
	 * @param {boolean} [options.https=false]
	 * @param {string} [options.certificatePath='sslcert/server.cert']
	 * @param {string} [options.privateKeyPath='sslcert/server.key']
	 * @param {string} [options.logHandle]
	 * @return {HttpServerListener}
	 */
	constructor(options){
		let defaults = {
			host: 'localhost',
			port: 80,
			https: false,
			certificatePath: 'sslcert/server.cert',
			privateKeyPath: 'sslcert/server.key',
			logHandle: 'HttpServerListener'
		};
		super(Object.extend(defaults, options));

        // properties
        this.httpServer = null;
		this.https = this.options.https;
		this.certificate = null;
		this.privateKey = null;
		this.certificatePath = this.options.certificatePath;
		this.privateKeyPath = this.options.privateKeyPath;

		// set certs
		if(typeof this.certificatePath === "string"){
			this.setSslCertificateFromFile(this.certificatePath);
		}
		if(typeof this.privateKeyPath === "string"){
			this.setSslPrivateKeyFromFile(this.privateKeyPath);
        }
        
		return this;
	}

	/**
	 * Set SSL cerficiate a provided path or from
	 * the path setting that was passed in the constructor.
	 * @param {string} path
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
	 * @param {string} path
	 * @return {HttpServerListener}
	 */
	setSslPrivateKeyFromFile(path){
        if (fs.existsSync(path)) {
            this.privateKey = fs.readFileSync(path, 'utf8');
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
		let self = this;
		this.httpServer.on('error', function(error){
			self.logger.error(error);
        });
        this.httpServer.on('connection', function(socket){
            console.log(1)
            self.createClient(socket);
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
			this.httpServer = this.createHttpsServer(null);
		}
		else {
			this.httpServer = this.createHttpServer(null);
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
        this.httpServer.close();
		return this;
    }

	/**
	 * Create an HTTP server.
	 * @param {object} listener
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
	 * @param {object} listener
	 * @return {Server}
	 */
	createHttpsServer(listener){
		let server = https.createServer({key: this.privateKey, cert: this.certificate}, listener);
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
     * @param {object} [options]
     * @param {string} [options.logHandle]
	 * @param {object} [connectData] 
	 * @return {HttpClient}
	 */
	createClient(socket, options, connectData){
		let id = `@${socket.remoteAddress}:${socket.remotePort}`;
		let defaults = {
			name: "HttpClient"+id,
			id: id,
			logHandle: this.logger.handle
		};
		let opts = Object.extend(this.clientOptions, defaults, options);
		return new HttpClient(socket, opts);
	}
}

module.exports = HttpServerListener;