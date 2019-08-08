const NodeServer = require('./index');

class AppExample {
    constructor(){
        this.webSocketServer = new NodeServer.WebSocketServer({port: 1234});
        this.httpServer = new NodeServer.HttpServer({port: 80});
        this.tcpServer = new NodeServer.TcpServer({port: 666});
        this.udpServer = new NodeServer.UdpServer({port: 9000});

        // http routes
        this.httpServer.addRoute('GET', '/status', function(req, res){
            res.json({status:"Online"});
        });
        this.httpServer.addRoute('GET', '/version', function(req, res){
            res.json({version:AppExample.VERSION});
        });

        // start
        this.httpServer.start();
        this.webSocketServer.start();
        this.tcpServer.start();
        this.udpServer.start();

        return this;
    }
}
AppExample.VERSION = "1.0.0";

module.exports = new AppExample();