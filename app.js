var dgram = require('dgram');
var http = require('http');
var static = require('node-static');
var sockjs = require('sockjs');
var commander = require('commander');
var version = require('./package').version;

commander
  .version(version)
  .option('-p, --port-out [n]', 'Webapp port', parseInt)
  .option('-i, --port-in  [n]', 'Stats port', parseInt)
  .parse(process.argv);

conf = {
  portIn: commander.portIn || 5555,
  portOut: commander.portOut || 5556
};

console.log('Running with conf', conf);

var socket = dgram.createSocket('udp4');
socket.bind(conf.portIn, function () {
  socket.on('message', function (buffer) {
    broadcast(buffer);
  });
});

var clients = [];
var ws = sockjs.createServer();
ws.on('connection', function (connection) {
  clients[connection.id] = connection;
  connection.on('close', function () {
    delete clients[connection.id];
  });
});
function broadcast(data) {
  for (var id in clients) {
    if (clients.hasOwnProperty(id)) {
      clients[id].write(data);
    }
  }
}

var file = new static.Server('.');
var httpServer = http.createServer(function (request, response) {
  request.addListener('end', function () {
    file.serveFile('static/index.html', 200, {}, request, response);
  }).resume();
});
ws.installHandlers(httpServer, {prefix: '/stats'});
httpServer.listen(conf.portOut, '0.0.0.0');
