const http = require('http');
// Definir la función que manejará las solicitudes
function handleRequest(req, res) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('¡Hola desde Node.js!');
}
// Crear el servidor utilizando la función definida
const server = http.createServer(handleRequest);
// Definir la función que se ejecuta cuando el servidor comienza a escuchar
function onServerStart() {
    console.log('Servidor funcionando en http://localhost:3000');
}
// Hacer que el servidor escuche en el puerto 3000
server.listen(3000, onServerStart);
