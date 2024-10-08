const WebSocket = require('ws');
const http = require('http');
const url = require('url');

const server = http.createServer();
const wss = new WebSocket.Server({ noServer: true });

let visitor = null;
let agent = null;
let callActive = false;

let visitorToAgentStream = null;
let agentToVisitorStream = null;

console.log('Checkpoint S1: Server started');

wss.on('connection', (ws, request) => {
    const pathname = url.parse(request.url).pathname;
    console.log(`Checkpoint S2: New connection - Path: ${pathname}`);

    if (pathname === '/visitor') {
        visitor = ws;
        console.log('Checkpoint S3: Visitor connected');
        if (agent) {
            agent.send(JSON.stringify({ type: 'incoming_call' }));
            console.log('Checkpoint S4: Notified agent of incoming call');
        }
    } else if (pathname === '/agent') {
        agent = ws;
        console.log('Checkpoint S5: Agent connected');
    } else if (pathname === '/visitor/stream') {
        visitorToAgentStream = ws;
        console.log('Checkpoint S15: Visitor to Agent stream WebSocket connected');
    } else if (pathname === '/agent/stream') {
        agentToVisitorStream = ws;
        console.log('Checkpoint S19: Agent to Visitor stream WebSocket connected');
    } else {
        console.log('Checkpoint S6: Rejecting connection - invalid path:', pathname);
        ws.close();
        return;
    }

    ws.on('message', (message) => {
        handleMessage(ws, message);
    });

    ws.on('close', () => {
        handleDisconnection(ws);
    });
});

function handleMessage(ws, message) {
    if (Buffer.isBuffer(message)) {
        // Handle binary data (video stream)
        if (ws === visitor || ws === visitorToAgentStream) {
            console.log('Checkpoint S16: Forwarding visitor stream data to agent, size:', message.length);
            if (agent) {
                agent.send(message, { binary: true }, (error) => {
                    if (error) console.error('Error sending to agent:', error);
                });
            }
        } else if (ws === agent || ws === agentToVisitorStream) {
            console.log('Checkpoint S20: Forwarding agent stream data to visitor, size:', message.length);
            if (visitor) {
                visitor.send(message, { binary: true }, (error) => {
                    if (error) console.error('Error sending to visitor:', error);
                });
            }
        }
    } else {
        // Handle text messages
        console.log('Checkpoint S21: Received text message:', message);
        try {
            const parsedMessage = JSON.parse(message);
            handleJsonMessage(parsedMessage, ws);
        } catch (error) {
            console.error('Error parsing message:', error.message);
        }
    }
}

function handleJsonMessage(parsedMessage, ws) {
    console.log('Checkpoint S22: Handling JSON message:', parsedMessage);
    if (parsedMessage.type === 'call_accepted') {
        callActive = true;
        if (visitor) visitor.send(JSON.stringify({ type: 'call_accepted' }));
        if (agent) agent.send(JSON.stringify({ type: 'call_accepted' }));
        console.log('Checkpoint S8: Call accepted, notified both parties');
    } else if (parsedMessage.type === 'call_denied' || parsedMessage.type === 'call_ended') {
        callActive = false;
        if (visitor) visitor.send(JSON.stringify(parsedMessage));
        if (agent) agent.send(JSON.stringify(parsedMessage));
        console.log('Checkpoint S9: Call ended or denied, notified both parties');
        closeStreamConnections();
    }
}

function handleDisconnection(ws) {
    if (ws === visitor) {
        console.log('Checkpoint S10: Visitor disconnected');
        visitor = null;
        if (agent) {
            agent.send(JSON.stringify({ type: 'call_ended' }));
            console.log('Checkpoint S11: Notified agent of call end');
        }
    } else if (ws === agent) {
        console.log('Checkpoint S12: Agent disconnected');
        agent = null;
        if (visitor) {
            visitor.send(JSON.stringify({ type: 'call_ended' }));
            console.log('Checkpoint S13: Notified visitor of call end');
        }
    } else if (ws === visitorToAgentStream) {
        console.log('Checkpoint S17: Visitor to Agent stream WebSocket closed');
        visitorToAgentStream = null;
    } else if (ws === agentToVisitorStream) {
        console.log('Checkpoint S21: Agent to Visitor stream WebSocket closed');
        agentToVisitorStream = null;
    }
    callActive = false;
    closeStreamConnections();
}

function closeStreamConnections() {
    if (visitorToAgentStream) {
        visitorToAgentStream.close();
        visitorToAgentStream = null;
    }
    if (agentToVisitorStream) {
        agentToVisitorStream.close();
        agentToVisitorStream = null;
    }
}

server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});

server.listen(8080, () => {
    console.log('Server is running on http://localhost:8080');
});