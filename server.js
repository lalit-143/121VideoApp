const WebSocket = require('ws');
const server = new WebSocket.Server({ port: 8080 });

let visitor = null;
let agent = null;

server.on('connection', (socket, req) => {
    const role = req.url.slice(1); // Get the role from the URL path

    if (role === 'visitor' && !visitor) {
        visitor = socket;
        console.log('Visitor connected');
        if (agent) {
            agent.send('incoming_call');
        }
    } else if (role === 'agent' && !agent) {
        agent = socket;
        console.log('Agent connected');
    } else {
        socket.close();
        return;
    }

    socket.on('message', (message) => {
        if (socket === visitor && agent) {
            agent.send(message);
        } else if (socket === agent && visitor) {
            visitor.send(message);
        }
    });

    socket.on('close', () => {
        if (socket === visitor) {
            console.log('Visitor disconnected');
            visitor = null;
            if (agent) {
                agent.send('call_ended');
            }
        } else if (socket === agent) {
            console.log('Agent disconnected');
            agent = null;
            if (visitor) {
                visitor.send('call_ended');
            }
        }
    });
});

console.log('WebSocket server is running on ws://localhost:8080');
