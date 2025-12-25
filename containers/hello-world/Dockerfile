FROM node:20-alpine

WORKDIR /app

# Create a simple HTTP server
RUN echo 'const http = require("http"); \
const server = http.createServer((req, res) => { \
  console.log(`Request: ${req.method} ${req.url}`); \
  res.writeHead(200, {"Content-Type": "application/json"}); \
  res.end(JSON.stringify({ \
    message: "Hello from Cloudflare Container!", \
    timestamp: new Date().toISOString(), \
    path: req.url, \
    headers: req.headers \
  })); \
}); \
server.listen(8080, "0.0.0.0", () => console.log("Server running on port 8080"));' > server.js

EXPOSE 8080

CMD ["node", "server.js"]
