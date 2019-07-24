const NodeServer = require('./index');

class AppExample {
    constructor(){
        this.webSocketServer = new NodeServer.WebSocketServer({port: 1234});
        this.httpServer = new NodeServer.HttpServer({port: 80});
        this.tcpServer = new NodeServer.TcpServer({port: 666});
        this.udpServer = new NodeServer.UdpServer({port: 9000});

        // start
        this.httpServer.start();
        this.webSocketServer.start();
        this.tcpServer.start();
        this.udpServer.start();

        return this;
    }
}

module.exports = new AppExample();