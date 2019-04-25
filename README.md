# node-server
A generic server with client and room management. The server is usable for UDP, TCP, HTTP/S, or WS/S.

## Example
Create a TCP server on localhost:777 and handle client events. Note that the `Server` class already manages clients in a `ClientManager` and has some default connection and message handlers built in.

```js
let tcpServer = new TcpServer({port:777});
tcpServer.on('connect', function(client){
   client.on('data', function(data){
       console.log(data);
   });
   client.on('disconnect', function(){
       console.log(`Client ${client.id} disconnected`);
   });
});
tcpServer.start();
```

# Description
`node-server` provides classes for a WebSocket, TCP, UDP, or HTTP server. Each server type extends from a base server that has an abstract communication layer. A server handles incoming requests with a server listener. A server listener is an object that emits connection and message events it receives on some port using some protocol. `node-server` comes with a server, server listener, client object, client manager, room object, and room manager. You can begin adding routing and logic to the server immediately.

# Classes
## ServerListener
`ServerListener` is an `EventEmitter` that, when implemented, listens for connections on a socket using some protocol. When new connections are detected, `ServerListener` creates the appropriate `Client` object and emits the `connect` event with a client object. The `ServerListener` comes with these implemented classes:
- `TcpServerListener`
- `UdpServerListener`
- `WebSocketServerListener`

## Server
`Server` is an `EventEmitter` that creates some type of `ServerListener` depending on the desired protocol. When a `ServerListener` emits the `connect` event with a client, `Server` adds that client to its `ClientManager` and attaches some default handlers to listen for data and other events. `Server` also has a `RoomManager` which can be used to group clients into a `Room`.

## Client
`Client` is an `EventEmitter` that wraps a socket. It is created by a `ServerListener` when a connection is detected. It always emits the following events, regardless of what kind of protocol it is
- `disconnect`
- `reconnect`
- `data`
- `error`
- `maxError`
- `ping`
- `pong`
Note that there is no `connect` event because you cannot have a `Client` before a connection; only `Server`/`ServerListener` emits `connect` events.