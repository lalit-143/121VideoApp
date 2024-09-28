const WebSocket = require('ws');
const agentServer = new WebSocket.Server({ port: 8081 });

let visitorSocket = null;

agentServer.on('connection', (agentSocket) => {
    console.log('Agent connected');

    // Assign the visitor socket when it connects
    if (visitorSocket) {
        console.log('Forwarding agent socket to visitor');
        visitorSocket.send(JSON.stringify({ message: 'Agent connected' }));
    }

    agentSocket.on('message', (message) => {
        console.log('Data received from agent');
        if (visitorSocket && visitorSocket.readyState === WebSocket.OPEN) {
            visitorSocket.send(message);
            console.log('Forwarding agent data to visitor');
        } else {
            console.error('Visitor socket not available or not open');
        }
    });

    agentSocket.on('close', () => {
        console.log('Agent disconnected');
        agentSocket = null; // Clear the agent socket reference
    });

    agentSocket.onerror = (error) => {
        console.error('WebSocket error on agent server:', error);
    };
});

// Handle visitor connection
const onVisitorConnect = (socket) => {
    visitorSocket = socket;
    console.log('Visitor connected');

    socket.on('close', () => {
        console.log('Visitor disconnected');
        visitorSocket = null; // Clear the visitor socket reference
    });
};

agentServer.on('connection', onVisitorConnect);

console.log('Agent WebSocket server running on ws://localhost:8081');
