const WebSocket = require('ws');

const sendPORT = 8080;
const receivePORT = 8081;

const sendServer = new WebSocket.Server({ port: sendPORT });
const receiveServer = new WebSocket.Server({ port: receivePORT });

sendServer.on('connection', socket => {
    console.log('Send server: Client connected');
    
    socket.on('message', message => {
        console.log('Send server: Data received from client');
        // Broadcast the received message to all connected clients on the receive server
        receiveServer.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
                console.log('Send server: Data sent to receiver');
            }
        });
    });

    socket.on('close', () => {
        console.log('Send server: Client disconnected');
    });
});

receiveServer.on('connection', socket => {
    console.log('Receive server: Client connected');
    
    socket.on('message', message => {
        console.log('Receive server: Data received from client');
        // Broadcast to send server clients (if needed)
    });

    socket.on('close', () => {
        console.log('Receive server: Client disconnected');
    });
});

console.log('WebSocket servers are running');
