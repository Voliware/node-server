const Server = require('../server/server');
const fs = require('fs');
const path = require('path');

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
            publicPath: "/public"
        };
        super(Object.extend(defaults, options));
        this.addStaticRoutes();
        return this;
    }

    attachServerListenerHandlers(serverListener){
        super.attachServerListenerHandlers(serverListener);
        
        let self = this;
        serverListener.on('request', function(request, response){
            self.routeRequest(request, response);
        });
        return this;
    }

    addStaticRoutes(){
        let publicPath = path.join(__dirname, '..', 'public');
        console.log(publicPath);
        let files = fs.readdirSync(publicPath);
        console.log(files);
    }

    /**
     * Add the default routes to the router map.
     * This 
     * @return {HttpServer}
     */
	addDefaultRoutes(){

    }

    isDirectory(path) {
        try {
            let stat = fs.lstatSync(path);
            return stat.isDirectory();
        } catch (e) {
            return false;
        }
    }

    

    routeRequest(request, response){
        this.logger.info(`routeRequest: url is ${request.url}`);
        // send to user defined routes first
        let route = this.router.get(request.url);
        if(route){
            let res = route(request);
            if(res){
                response.end(res);
            }
        }
        // try and find a static file
        else {
            let self = this;
            let publicPath = path.join(__dirname, '..', 'public');
            fs.readdir(publicPath, function(err, files){
                if(err) throw err;
                if(files){
                    for(let i = 0; i < files.length; i++){
                        if(self.isDirectory(path)){

                        }
                    }
                }
            })
        }
        response.end('hi')
    }
}

module.exports = HttpServer;