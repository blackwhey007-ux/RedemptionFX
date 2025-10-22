const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>RedemptionFX Test</title>
      <style>
        body { 
          background: #000; 
          color: #fff; 
          font-family: Arial, sans-serif; 
          text-align: center; 
          padding: 50px;
        }
        .logo { color: #ef4444; font-size: 3em; font-weight: bold; }
        .subtitle { color: #ffd700; font-size: 1.5em; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="logo">RedemptionFX</div>
      <div class="subtitle">Rise from ashes to gold</div>
      <p>Test server is working! 🚀</p>
      <p>If you can see this, the server is running on port 3001</p>
    </body>
    </html>
  `);
});

server.listen(3001, () => {
  console.log('Test server running on http://localhost:3001');
});
