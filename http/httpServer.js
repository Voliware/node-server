const Server = require('../server/server');
const Fs = require('fs');
const Path = require('path');
const Mime = require('mime-types');

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
            type: "http",
            publicPath: "public",
            publicIndex: "index.html"
        };
        super(Object.extend(defaults, options));
        this.publicPath = Path.join(__dirname, '..', defaults.publicPath);
        this.publicIndex = defaults.publicIndex;
        this.publicFiles = new Map();
        this.findPublicFiles(this.publicPath);
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
     * Createa and send 404 not found response.
     * @param {Response} response 
     * @return {HttpServer}
     */
    response404(response){
        response.statusCode = 404;
        response.end();
        return this;
    }

    /**
     * Create a response with a static resource.
     * @param {string} filepath 
     * @param {Response} response 
     * @return {HttpServer}
     */
    publicFileResponse(filepath, response){
        let self = this;
        Fs.readFile(filepath, function(err, file){
            if(err) {
                return self.response404(response);
            };
            if(file){
                let contentType = Mime.contentType(filepath);
                response.setHeader('Content-Type', contentType);
                response.statusCode = 200;
                response.write(file);
                response.end();
                return this;
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
        let self = this;
        let directories = [];
        this.addPublicFile("/", Path.join(this.publicPath, this.publicIndex));
        while(true){
            let files = Fs.readdirSync(path);

            for(let i = 0; i < files.length; i++){
                let file = files[i];
                let filepath = Path.join(path, file);
                if(self.isDirectory(filepath)){
                    directories.push(filepath);
                }
                else{
                    self.logger.debug("Registered file " + file);
                    let url = filepath.replace(self.publicPath, "");
                    url = url.replace(new RegExp("\\\\", 'g'), "/");
                    self.addPublicFile(url, filepath);
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
        if(!filepath){
            filepath = await this.findPublicFile(url);
        }
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
            return this.response404(response);
        }
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
        this.logger.info(`routeRequest: url is ${request.url}`);
        let route = this.router.get(request.url);
        if(route){
            return route(request, response);
        }
        else {
            return this.routePublicFile(request, response);
        }
    }
}

module.exports = HttpServer;