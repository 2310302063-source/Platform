const http = require('http');
const PORT = 3001;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify({ 
    status: 'running',
    project: 'Social Learning Platform',
    projectId: 'ndidi-8d9fc',
    backend: 'Express + Firebase Admin',
    timestamp: new Date().toISOString()
  }));
});

server.listen(PORT, () => {
  console.log(`Backend Server running on http://localhost:${PORT}`);
  console.log('Firebase Admin SDK initialized');
  console.log('Ready for frontend connections');
});
