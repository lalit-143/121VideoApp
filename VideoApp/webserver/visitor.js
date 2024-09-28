const WebSocket = require('ws');
const visitorServer = new WebSocket.Server({ port: 8080 });

let agentSocket = null;

visitorServer.on('connection', (visitorSocket) => {
    console.log('Visitor connected');

    // Assign the agent socket when it connects
    if (agentSocket) {
        console.log('Forwarding visitor socket to agent');
        agentSocket.send(JSON.stringify({ message: 'Visitor connected' }));
    }

    visitorSocket.on('message', (message) => {
        console.log('Data received from visitor');
        if (agentSocket && agentSocket.readyState === WebSocket.OPEN) {
            agentSocket.send(message);
            console.log('Forwarding visitor data to agent');
        } else {
            console.error('Agent socket not available or not open');
        }
    });

    visitorSocket.on('close', () => {
        console.log('Visitor disconnected');
    });

    visitorSocket.onerror = (error) => {
        console.error('WebSocket error on visitor server:', error);
    };
});

// Handle agent connection
const onAgentConnect = (socket) => {
    agentSocket = socket;
    console.log('Agent connected');
    
    socket.on('close', () => {
        console.log('Agent disconnected');
        agentSocket = null; // Clear the agent socket reference
    });
};

visitorServer.on('connection', onAgentConnect);

console.log('Visitor WebSocket server running on ws://localhost:8080');
