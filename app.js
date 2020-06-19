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
        this.http_server = new NodeServer.HttpServer({port: 80});
        this.websocket_server_b = new NodeServer.WebSocketServer({port: 2222});
        this.tcp_server = new NodeServer.TcpServer({port: 666});
        this.udp_server = new NodeServer.UdpServer({port: 667});

        // http routes
        this.http_server.addRoute('GET', '/status', (req, res) => {
            this.http_server.sendJson(res, {status:"Online"});
        });
        this.http_server.addRoute('GET', '/version', (req, res) => {
            this.http_server.sendJson(res, {version});
        });

        // start
        this.http_server.start();
        this.websocket_server_a = new NodeServer.WebSocketServer({http_server: this.http_server});
        this.websocket_server_a.start();
        this.websocket_server_b.start();
        this.tcp_server.start();
        this.udp_server.start();

        return this;
    }
}

module.exports = new AppExample();