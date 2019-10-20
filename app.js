const NodeServer = require('./index');
const version = require('./package.json').version;

/**
 * App example
 */
class AppExample {

    /**
     * Constructor
     * @return {AppExample}
     */
    constructor(){
        let self = this;

        this.webSocketServer = new NodeServer.WebSocketServer({port: 2234});
        this.httpServer = new NodeServer.HttpServer({port: 80});
        this.tcpServer = new NodeServer.TcpServer({port: 666});
        this.udpServer = new NodeServer.UdpServer({port: 9000});

        // http routes
        this.httpServer.addRoute('GET', '/status', function(req, res){
            self.httpServer.sendJson(res, {status:"Online"});
        });
        this.httpServer.addRoute('GET', '/version', function(req, res){
            self.httpServer.sendJson(res, {version});
        });

        // start
        this.httpServer.start();
        this.webSocketServer.start();
        this.tcpServer.start();
        this.udpServer.start();

        return this;
    }
}

module.exports = new AppExample();