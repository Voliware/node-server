# node-server
A generic server with client and room management. The server is usable for UDP, TCP, HTTP/S, or WS/S.

## Example
Create a TCP server on localhost:777 and handle client events. Note that the `Server` class already manages clients in a `ClientManager` and has some default connection and message handlers built in.

```js
let tcpServer = new TcpServer({port:777});
tcpServer.on('connect', function(client){
   client.on('message', function(message){
       console.log(message);
   });
   client.on('disconnect', function(){
       console.log(`Client ${client.id} disconnected`);
   });
});
tcpServer.start();
```

# Description
`node-server` provides classes for a WebSocket, TCP, UDP, or HTTP server. Each server type extends from a base server that has an abstract communication layer. A server handles incoming connections with a server listener. A server listener is an object that emits connection events it receives on some port using some protocol. `node-server` comes with a server, server listener, client object, client manager, room object, and room manager. You can begin adding routing and logic to the server immediately.

# Classes
## ServerListener
`ServerListener` is an `EventEmitter` that listens for connections on a socket using some protocol. When new connections are detected, `ServerListener` creates the appropriate `Client` object and emits the `connect` event with a client object. `node-server` provides these implemented classes:
- `TcpServerListener`
- `UdpServerListener`
- `WebSocketServerListener`
- `HttpServerListener`

## Server
`Server` is an `EventEmitter` that creates some type of `ServerListener` depending on the desired protocol. When a `ServerListener` emits the `connect` event with a client, `Server` adds that client to its `ClientManager` and attaches some default handlers to listen for data and other events. `Server` also has a `RoomManager` which can be used to group clients into a `Room`.

## Client
`Client` is an `EventEmitter` that wraps a socket. It is created by a `ServerListener` when a connection is detected. It always emits the following events, regardless of what kind of protocol it is
- `message`
- `disconnect`
- `reconnect`
- `error`
- `maxError`
- `ping`
- `pong`

Note that there is no `connect` event because you cannot have a `Client` before a connection; only `Server`/`ServerListener` emits `connect` events. The `message` event always emits some kind of `Message` object, which could be the default `Message` or one you create yourself that extends `Message`. A `Message` is the data from the client wrapped in an object - this could be JSON, XML, or any kind of data. `Message` has built-in JSON processing functions, but can be extended to do anything desirable. 

## ClientManager
`ClientManager` manages `Client`s. It can limit the amount of clients, keeps track of client counts, and can add a client to a blacklist.

## Room
`Room` is a small extension of a `ClientManager`. A room adds ownership, password security, and privitization (making it inivisible). `Room`s are particularly useful for reducing overhead. If you have some clients that want to communicate between each other - such as a chat room or a game - placing them in a `Room` means they do not have to talk directly to the `Server`, and the `Server` does not have to figure out what `Room` they are in. 

## RoomManager
`RoomManager` manages a listing of `Room` objects.

## Message
`Message` is an object used to send data to clients and to receive data from clients. `Message` is generic enough that it can be extended to support any messaging protocol. Its default implementation serializes an object of data to a JSON string to send to a client, and deserializes a string of data to a JSON object when receiving data from a client. If your messaging protocol is not JSON (say, XML) you would need to write a class such as `XmlMessage` and override the `serialize` and `deserialize` functions. Then, you can pass your `XmlMessage` constructor to your `Server` instance, and all messages would now be serialized and deserialized to and from XML.

`Message` also has an optional buffer that should be used for `TCP` and `UDP` servers. Clients that communicate on these protocols should always send some "end character" to indicate that they have completed sending a message, such as `\n` or `<EOF>` or anything else. This is unlike Web Socket and HTTP protocols.

Messages have the following properties
- `cmd`: the command to run
- `data`: the data to use with the `cmd`
- `msg`: a textual message, usually for error messages
- `status`: 0 for error, 1 for ok
