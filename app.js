const TcpServer = require('./tcp/tcpServer');
const UdpServer = require('./udp/udpServer');
const WebSocketServer = require('./webSocket/webSocketServer');
const HttpServer = require('./http/httpServer');

class AppExample {
    constructor(){
        this.udpServer = new UdpServer({port: 9000});
        this.tcpServer = new TcpServer({port: 666});
        this.webSocketServer = new WebSocketServer({port: 1234});
        this.httpServer = new HttpServer({port: 80});

        // start
        this.udpServer.start();
        this.tcpServer.start();
        this.httpServer.start();
        this.webSocketServer.start();

        setTimeout(()=>{
            this.webSocketServer.stop();
        },5000)
        return this;
    }
}

module.exports = new AppExample();