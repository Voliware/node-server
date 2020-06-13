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
        this.webSocketServer = new NodeServer.WebSocketServer({port: 2222});
        this.httpServer = new NodeServer.HttpServer({port: 80});
        this.tcpServer = new NodeServer.TcpServer({
            port: 666,
            message: {
                
            }
        });
        this.udpServer = new NodeServer.UdpServer({port: 9000});

        // http routes
        this.httpServer.addRoute('GET', '/status', (req, res) => {
            this.httpServer.sendJson(res, {status:"Online"});
        });
        this.httpServer.addRoute('GET', '/version', (req, res) => {
            this.httpServer.sendJson(res, {version});
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