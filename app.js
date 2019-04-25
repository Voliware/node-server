const TcpServer = require('./tcp/tcpServer');
const UdpServer = require('./udp/udpServer');
const WebSocketServer = require('./webSocket/webSocketServer');

class AppExample {
    constructor(){
        this.udpServer = new UdpServer({port: 9000});
        this.tcpServer = new TcpServer({port: 666});
        this.webSocketServer = new WebSocketServer({port: 1234});

        // start
        this.tcpServer.start();
        this.webSocketServer.start();
        this.udpServer.start();
        return this;
    }
}

module.exports = new AppExample();