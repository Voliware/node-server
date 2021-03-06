const Cookies = require('cookies');
const Querystring = require('query-string');
const Fs = require('fs');
const Path = require('path');
const Mime = require('mime-types');
const Router = require('find-my-way');
const UserAgent = require('useragent');
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
     * @param {Object} [options={}]
     * @param {String} [options.host="localhost"]
     * @param {Number} [options.port=80]
	 * @param {Boolean} [options.https=false]
     * @param {String} [options.public_path="public"]
     * @param {String} [options.public_index="index.html"]
	 * @param {String} [options.certificate_path='sslcert/server.cert']
	 * @param {String} [options.cert_bundle_path='sslcert/server.ca']
	 * @param {String} [options.private_key_path='sslcert/server.key']
     * @return {HttpServer}
     */
    constructor({
        host = "localhost",
        port = 80,
        https = false,
        router = Router(),
        public_path = Path.join(__dirname, '..', "public"),
        public_index = "index.html",
        certificate_path = "sslcert/server.cert",
        cert_bundle_path = "sslcert/server.ca",
        private_key_path = "sslcert/server.key"
    })
    {
        super({host, port, router});

        /**
         * Public file path to public files
         * @type {String}
         */
        this.public_path = public_path;

        /**
         * Public index HTML file.
         * @type {String}
         */
        this.public_index = public_index;
        
        /**
         * Map of file names to file paths
         * @type {String}
         */
        this.public_files = new Map();

        // find all public files from the public path
        this.findPublicFiles(this.public_path);

        // set the default router route to be a file lookup
        this.router.defaultRoute = this.routePublicFile.bind(this);
        
        /**
         * Listens for HTTP connections
         * @type {HttpServerListener}
         */
        this.server_listener = new HttpServerListener({
            https,
            certificate_path,
            cert_bundle_path,
            private_key_path,
            host: this.host,
            port: this.port
        });

        // todo: this needs to be done in a more intuitive way
        this.server_listener.setClientManager(this.client_manager);
    }

    /**
     * Attach handlers to the server listener
     * @param {ServerListener} server_listener
     */
    attachServerListenerHandlers(server_listener){
        super.attachServerListenerHandlers(server_listener);
        server_listener.on('request', (request, response) => {
            this.routeRequest(request, response);
        });
    }

    /**
     * Set a status code and end the response
     * @param {Response} response 
     * @return {Response}
     */
    sendStatusCode(response, statusCode){
        response.statusCode = statusCode;
        response.end();
        return response;
    }

    /**
     * Stringify an object as the 
     * data response, set the content type to
     * application/json, and set the status code to 200.
     * If the JSON cannot be stringified, the 
     * status code will be set to 500.
     * This ends the respnose.
     * @param {Object} response 
     * @param {Object} data
     * @param {Number} [code=200]
     * @return {Response}
     */
    sendJson(response, data, code = 200){
        try {
            let json = JSON.stringify(data);
            response.statusCode = code;
            response.setHeader('Content-Type', 'application/json');
            response.write(json);
        }
        catch (error){
            this.logger.error(error);
            response.statusCode = 500;
        }
        response.end();
        return response;
    };
    
    /**
     * Get the client's IP from a request.
     * https://stackoverflow.com/questions/8107856/how-to-determine-a-users-ip-address-in-node
     * @param {Object} request
     * @return {String}
     */
    getClientIp(request){
        return (request.headers['x-forwarded-for'] || '').split(',').pop() || 
            request.connection.remoteAddress || 
            request.socket.remoteAddress || 
            request.connection.socket.remoteAddress;
    }

    /**
     * Get the client's browser from a request.
     * @param {Object} request 
     * @return {Object}
     */
    getClientBrowser(request){
        return UserAgent.lookup(request.headers['user-agent']);
    }

    /**
     * Get information about a client making the request.
     * @param {ClientRequest} request 
     * @param {ServerResponse} response 
     * @returns {{ip: String, browser: Object, cookies: Object}} object with ip, browser, cookies
     */
    getClient(request, response){
        let ip = this.getClientIp(request);
        let browser = this.getClientBrowser(request);
        let cookies = new Cookies(request, response);
        return {ip, browser, cookies};
    }

    /**
     * Get the stats for a file
     * @param {String} filepath
     * @return {Promise<Fs.Stats>} 
     */
    getFileStats(filepath){
        return new Promise((resolve, reject) => {
            Fs.stat(filepath, (err, stats) => {
                if(err){
                    reject(err);
                }
                else {
                    resolve(stats);
                }
            });
        });
    }

    /**
     * Create a response with a file.
     * @todo Add caching here - if a file is requested very often, it could go into RAM
     * @param {String} filepath 
     * @param {Response} response 
     * @return {Response}
     */
    async sendFile(filepath, response){
        try{
            let stats = await this.getFileStats(filepath);
            let readable = Fs.createReadStream(filepath);
            let ext = Path.extname(filepath);
            let contentType = Mime.contentType(ext);
            response.on('error', (err) => {
                readable.end();
            });
            readable.pipe(response);
            response.setHeader('Content-Type', contentType);
            response.setHeader('Content-Length', stats.size);
            response.setHeader('X-Content-Type-Options', 'nosniff')
            response.setHeader('Server', 'Voliware');
            response.statusCode = 200;
        }
        catch(error){
            return this.sendStatusCode(response, 404);
        }
    }

    /**
     * Check if a file exists
     * @param {String} filepath
     * @return {Promise} 
     */
    fileExists(filepath){
        return new Promise((resolve, reject) => {
            return Fs.access(filepath, (err) => {
                resolve(!err);
            });
        });
    }

    /**
     * Check if a path is a directory
     * @param {String} path 
     * @return {Boolean} true if it is
     */
    isDirectory(path) {
        try {
            let stat = Fs.lstatSync(path);
            return stat.isDirectory();
        } catch (e) {
            return false;
        }
    }

    /**
     * Find and register static public files.
     * This will block while looping through the public path directory and 
     * recursively add each file to the static map.
     * @todo Add file size, stats, mime, to each entry
     * @param {String} path 
     */
    findPublicFiles(path){
        let directories = [];
        this.addPublicFile("/", Path.join(this.public_path, this.public_index));
        while(true){
            let files = Fs.readdirSync(path);

            for(let i = 0; i < files.length; i++){
                let file = files[i];
                let filepath = Path.join(path, file);
                if(this.isDirectory(filepath)){
                    directories.push(filepath);
                }
                else{
                    this.logger.debug("Registered file " + file);
                    let url = filepath.replace(this.public_path, "");
                    url = url.replace(new RegExp("\\\\", 'g'), "/");
                    this.addPublicFile(url, filepath);
                }
            }

            if(!directories.length){
                this.logger.info("Registered static files");
                break;
            }
            else {
                path = directories.pop();
            }
        }
    }

    /**
     * Add a static file to the public_files
     * map where the key is the URL request
     * and the value is the full filepath.
     * @param {String} url - url request, eg /js/app.js
     * @param {String} filepath - file path, eg C:/webserver/js/app.js
     */
    addPublicFile(url, filepath){
        this.public_files.set(url, filepath);
    }

    /**
     * Find a static file from the static file map.
     * If the file is not found, try to find it.
     * If the file is then found, add it to the map.
     * @param {String} url 
     * @return {Null|String} filepath or null if not found
     */
    async findPublicFile(url){
        let filepath = Path.join(this.public_path, url);
        let exists = await this.fileExists(filepath);
        if(exists){
            this.addPublicFile(url, filepath);
            return filepath;
        }
        return null;
    }

    /**
     * Get a static file from the map or from searching the FS.
     * @param {String} url 
     * @return {Null|String}
     */
    async getPublicFile(url){
        let filepath = this.public_files.get(url);
        return filepath || null;
    }

    /**
     * Route a request for a static file.
     * @param {Request} request 
     * @param {Response} response 
     */
    async routePublicFile(request, response){
        let filepath = await this.getPublicFile(request.url);
        if(!filepath){
            filepath = await this.findPublicFile(request.url);
        }
        if(filepath){
            this.sendFile(filepath, response);
        }
        else {
            this.sendStatusCode(response, 404);
        }
    }
    
    /**
     * Add a route to the router
     * @param {String} method 
     * @param {String} route 
     * @param {Function} handler - function to handle the route
     */
    addRoute(method, route, handler){   
        method = method.toUpperCase();
        this.router.on(method, route, (request, response, params) => {
            this.getRequestData(request)
                .then((body) => {
                    handler(request, response, {
                        params: params,
                        body: this.parseBody(body, request),
                        query: this.parseQuery(request.url)
                    });
                })
                .catch((error) => {
                    this.logger.error(error);
                    handler(request, response, {});
                });
        });
    }

    /**
     * Get a route callback from the router
     * @param {String} method 
     * @param {String} route 
     * @param {String} [version] 
     * @return {Function}
     */
    getRoute(method, route, version){
        return this.router.find(method, route, version);
    }

    /**
     * Delete a route from the router.
     * @param {String} method 
     * @param {String} route 
     */
    deleteRoute(method, route){
        this.router.off(method, route);
    }

    /**
     * Print out all routes
     */
    printRoutes(){
        this.router.prettyPrint();
    }
    
    /**
     * Add the default routes to the router map.
     */
	addDefaultRoutes(){
    }

    /**
     * Parse a url for query parameters.
     * @param {String} url 
     * @return {Object} object for each param, empty if none
     */
    parseQuery(url){
        let index = url.indexOf('?');
        let query = {};
        if(index > -1){
            let querystring = url.substr(index, url.length);
            query = Querystring.parse(querystring);
        }
        return query;
    }

    /**
     * Parse a string of data, aka "body", using the request headers to 
     * determine the type of data. Returns the best matching type of 
     * data based on  the Content-Type header.
     * @param {String} body 
     * @param {Request} request 
     * @return {Object|String}
     */
    parseBody(body, request){
        let mime = Mime.extension(request.headers['content-type']);
        switch(mime){
            case "txt":
                try {
                    return JSON.parse(body);
                }
                catch(e){
                    return body;
                }
            default:
                return body;
        }
    }
    
    /**
     * Get request data from an HTTP request. This returns a promise as data 
     * will come over the client socket over some period of time - ie it is 
     * not all  availalble immediately when the request is received.
     * @param {Request} request 
     * @return {Promise}
     */
    getRequestData(request){
        return new Promise((resolve, reject) => {
            let body = "";
            request.on('data', (data) => {
                body += data.toString();
            })
            request.on('end', () => {
                resolve(body);
            });
            request.on('error', (error) => {
                reject(error);
            });
        });
    }

    /**
     * Route a request.
     * First try to route a user defined request, such as /user/dashboard/.
     * If not found, assume the request is for a static resource like an
     * image or HTML file.
     * @param {Request} request 
     * @param {Response} response 
     */
    routeRequest(request, response){
        this.router.lookup(request, response);
    }
}

module.exports = HttpServer;