const NodeServer = require('./index');

class AppExample {
    constructor(){
        this.udpServer = new NodeServer.UdpServer({port: 9000});
        this.tcpServer = new NodeServer.TcpServer({port: 666});
        this.webSocketServer = new NodeServer.WebSocketServer({port: 1234});
        this.httpServer = new NodeServer.HttpServer({port: 80});

        // start
        this.udpServer.start();
        this.tcpServer.start();
        this.httpServer.start();
        this.webSocketServer.start();

        return this;
    }
}

module.exports = new AppExample();