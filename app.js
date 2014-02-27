#!/usr/bin/env node

var http = require('http');
var dgram = require('dgram');
var express = require('express');
var sockjs = require('sockjs');
var commander = require('commander');
var version = require('./package').version;

commander
  .version(version)
  .option('-a, --addr     [s]', 'Webapp addr')
  .option('-p, --port-out [n]', 'Webapp port', parseInt)
  .option('-i, --port-in  [n]', 'Stats port', parseInt)
  .parse(process.argv);

conf = {
  addr: commander.addr || '0.0.0.0',
  portIn: commander.portIn || 7777,
  portOut: commander.portOut || 7778
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

var app = express();
app.use(express.static(__dirname + '/static'));

var httpServer = http.createServer(app);
ws.installHandlers(httpServer, {prefix: '/stats'});
httpServer.listen(conf.portOut, conf.addr);
