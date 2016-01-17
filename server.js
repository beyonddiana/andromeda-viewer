'use strict';

var dgram = require('dgram');

var xmlrpc = require('xmlrpc');
var express = require('express');
var expressWs = require('express-ws');
var bodyParser = require('body-parser');

var macaddress;
// the macaddress can be found in node version 0.12 in os.networkInterfaces()
require('macaddress').one(function (error, mac) {
  if (!error) {
    macaddress = mac;
  } else {
    macaddress = '00:00:00:00:00:00';
    console.error('Mac address wasn\'t found!');
  }
});

// SL uses its own tls-certificate
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Web-Server

var app = express();
expressWs(app); // Adding ws to express

app.use(express.static('builds'));

app.get('/', function (req, res) {
  res.sendFile('index.html', {root: process.cwd()});
});

app.get('/login.css', function (req, res) {
  res.sendFile('login.css', {root: process.cwd() + '/style'});
});

app.post('/login', bodyParser.json(), function processLogin (req, res) {
  var reqData = req.body;

  var xmlrpcClient = xmlrpc.createSecureClient({
    host: 'login.agni.lindenlab.com',
    port: 443,
    path: '/cgi-bin/login.cgi'
  });

  reqData.mac = macaddress;

  var method = 'login_to_simulator';

  xmlrpcClient.methodCall(method, [reqData], function (err, data) {
    if (err) {
      res.status(400);
      res.json(err);
    } else {
      res.json(data);
    }
  });
});

app.ws('/', function (ws, req) {
  if (websocketOriginIsAllowed(req)) {
    allBridge.push(new Bridge(ws));
  }
});

app.listen(process.env.PORT || 8000, process.env.IP || '127.0.0.1');

console.log('Andromeda is running!\nAt: http://' +
  (process.env.IP || '127.0.0.1') + ':' + (process.env.PORT || 8000) +
  '\nNot ready for production!\n');

// Websocket bridge from client to sim

function websocketOriginIsAllowed (req) {
  // put logic here to detect whether the specified origin is allowed.
  // for development everytime true
  return true;
}

var allBridge = []; // all Bridges will be stored here.
// if a brige closes, it will search itself in here and delete itself.

// The Bridge stores the websocket to the client and the UDP-socket to the sim
// the first 6 bytes of a message, between this server and a client, is the
// IP and Port of the sim
function Bridge (wsConnection) {
  this.websocket = wsConnection;
  this.udp = dgram.createSocket('udp4');
  this.udp.bind();

  var self = this;

  // from client to sim
  this.websocket.on('message', function (message) {
    if (message instanceof Buffer) {
      var ip = message.readUInt8(0) + '.' +
        message.readUInt8(1) + '.' +
        message.readUInt8(2) + '.' +
        message.readUInt8(3);

      var slayer = message.slice(6);
      self.udp.send(slayer, 0, slayer.length, message.readUInt16LE(4), ip);
    }
  });
  this.websocket.on('close', function (message) {
    if (self.udp) {
      self.udp.close();
      self.closeConnetion();
    }
  });

  // from sim to client
  this.udp.on('message', function (message, rinfo) {
    var buffy = Buffer.concat([
      new Buffer(6),
      message
    ]);
    // add IP address
    var ipParts = rinfo.address.split('.');
    for (var i = 0; i < 4; i++) {
      buffy.writeUInt8(Number(ipParts[i]), i);
    }
    // add port
    buffy.writeUInt16LE(rinfo.port, 4);

    // self.websocket.sendBytes(buffy);
    self.websocket.send(buffy, { binary: true, mask: true });
  });
  this.udp.on('close', function (message) {
    if (self.websocket) {
      self.websocket.close();
      self.closeConnetion();
    }
  });
}
// delete the upd and websockets and finds the bridge and also deletes it
Bridge.prototype.closeConnetion = function () {
  var pos = allBridge.indexOf(this);
  allBridge.splice(pos, 1);
  this.udp = undefined;
  this.websocket = undefined;
};
