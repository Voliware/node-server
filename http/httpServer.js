const Querystring = require('query-string');
const Server = require('../server/server');
const Fs = require('fs');
const Path = require('path');
const Mime = require('mime-types');
const Router = require('find-my-way');
const UserAgent = require('useragent');

/**
 * HTTP Server.
 * A barebones HTTP Server ready to be used.
 * @extends {Server}
 */
class HttpServer extends Server {
   
    /**
     * Constructor
     * @param {object} [options={}]
     * @param {string} [options.logHandle="HttpServer"]
     * @param {string} [options.type="http"]
     * @param {string} [options.publicPath="public"]
     * @return {HttpServer}
     */
    constructor(options = {}){
        let defaults = {
            port: 80,
            name: "HttpServer",
            logHandle: "HttpServer",
            type: "http",
            publicPath: Path.join(__dirname, '..', "public"),
            publicIndex: "index.html",
            router: Router()
        };
        super(Object.extend(defaults, options));
        this.publicPath = defaults.publicPath;
        this.publicIndex = defaults.publicIndex;
        this.publicFiles = new Map();
        this.findPublicFiles(this.publicPath);
        this.router.defaultRoute = this.routePublicFile.bind(this);
        // todo: this needs to be done in a more intuitive way
        this.serverListener.setClientManager(this.clientManager);
        return this;
    }

    /**
     * Attach handlers to the server listener
     * @param {ServerListener} serverListener
     * @return {HttpServer} 
     */
    attachServerListenerHandlers(serverListener){
        super.attachServerListenerHandlers(serverListener);
        let self = this;
        serverListener.on('request', function(request, response){
            self.routeRequest(request, response);
        });
        return this;
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
     * @param {object} response 
     * @param {object} data
     * @return {Response}
     */
    sendJson(response, data){
        try {
            let json = JSON.stringify(data);
            response.statusCode = 200;
            response.setHeader('Content-Type', 'application/json');
            response.write(json);
            response.end();
        }
        catch (error){
            this.logger.error(error);
            response.statusCode = 500;
            response.end();
        }
        return response;
    };
    
    /**
     * Get the client's IP from a request.
     * https://stackoverflow.com/questions/8107856/how-to-determine-a-users-ip-address-in-node
     * @param {object} request
     * @return {string}
     */
    getClientIp(request){
        return (request.headers['x-forwarded-for'] || '').split(',').pop() || 
            request.connection.remoteAddress || 
            request.socket.remoteAddress || 
            request.connection.socket.remoteAddress;
    }

    /**
     * Get the client's browser from a request.
     * @param {object} request 
     * @return {object}
     */
    getClientBrowser(request){
        return UserAgent.lookup(request.headers['user-agent']);
    }

    /**
     * Create a response with a static resource.
     * @param {string} filepath 
     * @param {Response} response 
     * @return {Response}
     */
    publicFileResponse(filepath, response){
        let self = this;
        Fs.readFile(filepath, function(err, file){
            if(err) {
                return self.sendStatusCode(response, 404);
            };
            if(file){
                let contentType = Mime.contentType(filepath);
                response.setHeader('Content-Type', contentType);
                response.statusCode = 200;
                response.write(file);
                response.end();
                return response;
            }
        });
    }

    /**
     * Check if a file exists
     * @param {string} filepath
     * @return {Promise} 
     */
    fileExists(filepath){
        return new Promise(function(resolve, reject){
            return Fs.access(filepath, function(err){
                resolve(!err);
            });
        });
    }

    /**
     * Check if a path is a directory
     * @param {string} path 
     * @return {boolean} true if it is
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
     * This will block while looping through
     * the public path directory and recursively
     * add each file to the static map.
     * @param {string} path 
     * @return {HttpServer}
     */
    findPublicFiles(path){
        let directories = [];
        this.addPublicFile("/", Path.join(this.publicPath, this.publicIndex));
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
                    let url = filepath.replace(this.publicPath, "");
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

        return this;
    }

    /**
     * Add a static file to the publicFiles
     * map where the key is the URL request
     * and the value is the full filepath.
     * @param {string} url - url request, eg /js/app.js
     * @param {string} filepath - file path, eg C:/webserver/js/app.js
     * @return {HttpServer}
     */
    addPublicFile(url, filepath){
        this.publicFiles.set(url, filepath);
        return this;
    }

    /**
     * Find a static file from the static file map.
     * If the file is not found, try to find it.
     * If the file is then found, add it to the map.
     * @param {string} url 
     * @return {null|string} filepath or null if not found
     */
    async findPublicFile(url){
        let filepath = Path.join(this.publicPath, url);
        let exists = await this.fileExists(filepath);
        if(exists){
            this.addPublicFile(url, filepath);
            return filepath;
        }
        return null;
    }

    /**
     * Get a static file from the map
     * or from searching the FS.
     * @param {string} url 
     * @return {null|string}
     */
    async getPublicFile(url){
        let filepath = this.publicFiles.get(url);
        return filepath || null;
    }

    /**
     * Route a request for a static file.
     * @param {Request} request 
     * @param {Response} response 
     * @return {HttpServer}
     */
    async routePublicFile(request, response){
        let filepath = await this.getPublicFile(request.url);
        if(!filepath){
            filepath = await this.findPublicFile(request.url);
        }
        if(filepath){
            return this.publicFileResponse(filepath, response);
        }
        else {
            return this.sendStatusCode(response, 404);
        }
    }
    
    /**
     * Add a route to the router
     * @param {string} method 
     * @param {string} route 
     * @param {function} handler - function to handle the route
     * @return {HttpServer}
     */
    addRoute(method, route, handler){   
        method = method.toUpperCase();
        let self = this;
        this.router.on(method, route, function(request, response, params){
            self.getRequestData(request)
                .then(function(body){
                    handler(request, response, {
                        params: params,
                        body: self.parseBody(body, request),
                        query: self.parseQuery(request.url)
                    });
                })
                .catch(function(error){
                    self.logger.error(error);
                    handler(request, response, {});
                });
        });
        return this;
    }

    /**
     * Get a route callback from the router
     * @param {string} method 
     * @param {string} route 
     * @param {string} [version] 
     * @return {function}
     */
    getRoute(method, route, version){
        return this.router.find(method, route, version);
    }

    /**
     * Delete a route from the router.
     * @param {string} method 
     * @param {string} route 
     * @return {HttpServer}
     */
    deleteRoute(method, route){
        this.router.off(method, route);
        return this;
    }

    /**
     * Print out all routes
     * @return {HttpServer}
     */
    printRoutes(){
        this.router.prettyPrint();
        return this;
    }
    
    /**
     * Add the default routes to the router map.
     * Override as to not add the default Server 
     * routes which are not compatible.
     * @return {HttpServer}
     */
	addDefaultRoutes(){
		return this;
    }

    /**
     * Parse a url for query parameters.
     * @param {string} url 
     * @return {object} object for each param, empty if none
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
     * Parse a string of data, aka "body",
     * using the request headers to determine
     * the type of data. Returns the best
     * matching type of data based on 
     * the Content-Type header.
     * @param {string} body 
     * @param {Request} request 
     * @return {object|string}
     */
    parseBody(body, request){
        let mime = Mime.extension(request.headers['content-type']);
        switch(mime){
            case "txt":
                try {
                    return JSON.parse(body);
                }
                catch(e){
                    return {};
                }
            default:
                return body;
        }
    }
    
    /**
     * Get request data from an HTTP request.
     * This returns a promise as data will
     * come over the client socket over some
     * period of time - ie it is not all 
     * availalble immediately when the request
     * is received.
     * @param {Request} request 
     * @return {Promise}
     */
    getRequestData(request){
        return new Promise(function(resolve, reject){
            let body = "";
            request.on('data', function(data){
                body += data.toString();
            })
            request.on('end', function(){
                resolve(body);
            });
            request.on('error', function(error){
                reject(error);
            });
        });
    }

    /**
     * Override the client whisper handler
     * to instead do nothing.
     * @param {Message} message 
     * @param {HttpClient} client 
     * @return {null}
     */
    handleMessageClientWhisper(message, client){
        this.logger.error("Cannot whisper to HTTP clients");
        return null;
    }

    /**
     * Route a request.
     * First try to route a user defined request,
     * such as /user/dashboard/.
     * If not found, assume the request is for
     * a static resource like an image or HTML file.
     * @param {Request} request 
     * @param {Response} response 
     * @return {HttpServer}
     */
    routeRequest(request, response){
        this.router.lookup(request, response);
        return this;
    }
}

module.exports = HttpServer;