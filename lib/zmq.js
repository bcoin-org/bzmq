/*!
 * zmq.js - zeromq server for bcoin
 * Copyright (c) 2016, Christopher Jeffrey (MIT License).
 * https://github.com/bcoin-org/bcoin
 */

'use strict';

var assert = require('assert');
var EventEmitter = require('events').EventEmitter;
var zmq = require('zeromq');

function ZMQ(options) {
  if (!(this instanceof ZMQ))
    return new ZMQ(options);

  EventEmitter.call(this);

  assert(options, 'ZMQ requires options.');
  assert(options.node, 'ZMQ requires a node.');

  this.options = options;
  this.node = this.options.node;
  this.logger = this.node.logger.context('zmq');

  this.sockets = new Sockets();
  this.closed = true;

  this.init();
}

inherits(ZMQ, EventEmitter);

ZMQ.id = 'zmq';

ZMQ.init = function init(node) {
  var config = node.config;
  var server;

  server = new ZMQ({
    node: node,
    logger: node.logger,
    pubHashBlock: config.str(['zmq-hashblock', 'zmq-pub-hashblock']),
    pubRawBlock: config.str(['zmq-rawblock', 'zmq-pub-rawblock']),
    pubHashTX: config.str(['zmq-hashtx', 'zmq-pub-hashtx']),
    pubRawTX: config.str(['zmq-rawtx', 'zmq-pub-rawtx'])
  });

  server.on('error', function(err) {
    server.logger.error(err);
  });

  return server;
};

ZMQ.prototype.init = function init() {
  var self = this;
  var options = this.options;

  if (options.pubHashBlock)
    this.sockets.add('hashblock', options.pubHashBlock);

  if (options.pubRawBlock)
    this.sockets.add('rawblock', options.pubRawBlock);

  if (options.pubHashTX)
    this.sockets.add('hashtx', options.pubHashTX);

  if (options.pubRawTX)
    this.sockets.add('rawtx', options.pubRawTX);

  this.node.mempool.on('tx', function(tx) {
    if (self.closed)
      return;

    self.sockets.send('hashtx', reverse(tx.hash()));
    self.sockets.send('rawtx', tx.toRaw());
  });

  this.node.chain.on('connect', function(entry, block) {
    if (self.closed)
      return;

    self.sockets.send('hashblock', reverse(block.hash()));
    self.sockets.send('rawblock', block.toRaw());
  });
};

ZMQ.prototype.open = function open() {
  try {
    this.sockets.open();
  } catch (e) {
    return Promise.reject(e);
  }

  this.closed = false;

  this.logger.info('ZeroMQ loaded.');

  return Promise.resolve();
};

ZMQ.prototype.close = function close() {
  try {
    this.sockets.close();
  } catch (e) {
    return Promise.reject(e);
  }

  this.closed = true;

  return Promise.resolve();
};

function reverse(hash) {
  var data = new Buffer(32);
  var i;

  for (i = 0; i < data.length; i++)
    data[i] = hash[31 - i];

  return data;
}

function inherits(obj, from) {
  obj.super_ = from;

  Object.setPrototypeOf(obj.prototype, from.prototype);
  Object.defineProperty(obj.prototype, 'constructor', {
    value: obj,
    enumerable: false
  });
}

function Sockets() {
  this.map = {};
  this.topics = {};
}

Sockets.prototype.add = function(topic, addr) {
  assert(typeof topic === 'string');
  assert(typeof addr === 'string');
  assert(!this.topics[topic]);
  if (!this.map[addr])
    this.map[addr] = zmq.socket('pub');
  this.topics[topic] = this.map[addr];
  return this.map[addr];
};

Sockets.prototype.get = function get(key) {
  return this.map[key];
};

Sockets.prototype.has = function has(topic) {
  return this.topics[topic];
};

Sockets.prototype.keys = function keys() {
  return Object.keys(this.map);
};

Sockets.prototype.open = function open() {
  var keys = this.keys();
  var i, addr, socket;

  for (i = 0; i < keys.length; i++) {
    addr = keys[i];
    socket = this.get(addr);
    socket.bindSync(addr);
  }
};

Sockets.prototype.close = function close() {
  var keys = this.keys();
  var i, addr, socket;

  for (i = 0; i < keys.length; i++) {
    addr = keys[i];
    socket = this.get(addr);
    socket.unbindSync();
  }
};

Sockets.prototype.send = function send(topic, data) {
  var socket = this.topics[topic];

  if (!socket)
    return;

  socket.send([topic, data]);
};

module.exports = ZMQ;
