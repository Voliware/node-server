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

## ClientManager
`ClientManager` manages `Client`s. It can limit the amount of clients, keeps track of client counts, and can add a client to a blacklist.

## Room
`Room` is a small extension of a `ClientManager`. A room adds ownership, password security, and privitization (making it inivisible). 

## RoomManager
`RoomManager` manages a listing of `Room` objects.

## Message
`Message` is an object used to send data to clients, and to receive data from clients. `Message` is generic enough that it can be extended to support any messaging protocol. Its default implementation serializes an object of data to a JSON string to send to a client, and deserialize a string of data to a JSON object when receiving data from a client. If your messaging protocol is not JSON (say, XML) you would need to write a class such as `XmlMessage` and override the `serialize` and `deserialize` functions. Then, you can pass your `XmlMessage` constructor to your `Server` instance, and all messages would now be serialized and deserialized to and from XML.

Messages have the following properties
- `cmd`: the command to run
- `data`: the data to use with the `cmd`
- `msg`: a textual message, usually for error messages
- `status`: 0 for error, 1 for ok
