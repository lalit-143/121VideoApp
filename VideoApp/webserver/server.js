const WebSocket = require('ws');
const server = new WebSocket.Server({ port: 8080 });

let visitor = null;
let agent = null;
let callActive = false;

let visitorToAgentStream = null;
let agentToVisitorStream = null;

console.log('Checkpoint S1: Server started');

// Handle signaling connections for /visitor and /agent
server.on('connection', (socket, req) => {
    const path = req.url;
    console.log(`Checkpoint S2: New connection - Path: ${path}`);

    if (path === '/visitor') {
        visitor = socket;
        console.log('Checkpoint S3: Visitor connected');
        if (agent) {
            agent.send(JSON.stringify({ type: 'incoming_call' }));
            console.log('Checkpoint S4: Notified agent of incoming call');
        }
    } else if (path === '/agent') {
        agent = socket;
        console.log('Checkpoint S5: Agent connected');
    } else {
        console.log('Checkpoint S6: Rejecting connection - invalid path:', path);
        socket.close(); // Close the connection
        return;
    }

    socket.on('message', (message) => {
        console.log(`Checkpoint S7: Received message from ${socket === visitor ? 'visitor' : 'agent'}`);
        const parsedMessage = JSON.parse(message);

        if (parsedMessage.type === 'call_accepted') {
            callActive = true;
            if (visitor) visitor.send(JSON.stringify({ type: 'call_accepted' }));
            if (agent) agent.send(JSON.stringify({ type: 'call_accepted' }));
            console.log('Checkpoint S8: Call accepted, notified both parties');
        } else if (parsedMessage.type === 'call_denied' || parsedMessage.type === 'call_ended') {
            callActive = false;
            if (visitor) visitor.send(message);
            if (agent) agent.send(message);
            console.log('Checkpoint S9: Call ended or denied, notified both parties');
            if (visitorToAgentStream) visitorToAgentStream.close();
            if (agentToVisitorStream) agentToVisitorStream.close();
            visitorToAgentStream = null;
            agentToVisitorStream = null;
        }
    });

    socket.on('close', () => {
        if (socket === visitor) {
            console.log('Checkpoint S10: Visitor disconnected');
            visitor = null;
            if (agent) {
                agent.send(JSON.stringify({ type: 'call_ended' }));
                console.log('Checkpoint S11: Notified agent of call end');
            }
            if (visitorToAgentStream) visitorToAgentStream.close();
            visitorToAgentStream = null;
        } else if (socket === agent) {
            console.log('Checkpoint S12: Agent disconnected');
            agent = null;
            if (visitor) {
                visitor.send(JSON.stringify({ type: 'call_ended' }));
                console.log('Checkpoint S13: Notified visitor of call end');
            }
            if (agentToVisitorStream) agentToVisitorStream.close();
            agentToVisitorStream = null;
        }
        callActive = false;
    });
});

server.on('upgrade', (request, socket, head) => {
    const pathname = request.url;

    if (pathname === '/visitor-to-agent') {
        console.log('Checkpoint S14: Visitor to Agent stream WebSocket upgrading...');
        const ws = new WebSocket.Server({ noServer: true }).handleUpgrade(request, socket, head, (ws) => {
            visitorToAgentStream = ws;
            console.log('Checkpoint S15: Visitor to Agent stream WebSocket connected');

            ws.on('message', (message) => {
                if (callActive && agentToVisitorStream) {
                    agentToVisitorStream.send(message);
                    console.log('Checkpoint S16: Forwarded visitor stream data to agent, size:', message.byteLength);
                }
            });

            ws.on('close', () => {
                console.log('Checkpoint S17: Visitor to Agent stream WebSocket closed');
                visitorToAgentStream = null;
            });
        });
    } else if (pathname === '/agent-to-visitor') {
        console.log('Checkpoint S18: Agent to Visitor stream WebSocket upgrading...');
        const ws = new WebSocket.Server({ noServer: true }).handleUpgrade(request, socket, head, (ws) => {
            agentToVisitorStream = ws;
            console.log('Checkpoint S19: Agent to Visitor stream WebSocket connected');

            ws.on('message', (message) => {
                if (callActive && visitorToAgentStream) {
                    visitorToAgentStream.send(message);
                    console.log('Checkpoint S20: Forwarded agent stream data to visitor, size:', message.byteLength);
                }
            });

            ws.on('close', () => {
                console.log('Checkpoint S21: Agent to Visitor stream WebSocket closed');
                agentToVisitorStream = null;
            });
        });
    } else {
        console.log('Checkpoint S22: Rejecting unknown upgrade request:', pathname);
        socket.destroy(); // Reject unknown upgrade requests
    }
});