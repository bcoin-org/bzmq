/*!
 * zmq.js - zeromq server for bcoin
 * Copyright (c) 2016, Christopher Jeffrey (MIT License).
 * https://github.com/bcoin-org/bcoin
 */

'use strict';

const assert = require('bsert');
const EventEmitter = require('events');
const zmq = require('zeromq');

/**
 * ZMQ
 */

class ZMQ extends EventEmitter {
  constructor(options) {
    super();

    assert(options, 'ZMQ requires options.');
    assert(options.node, 'ZMQ requires a node.');

    this.options = options;
    this.node = this.options.node;
    this.logger = this.node.logger.context('zmq');

    this.sockets = new Sockets();
    this.closed = true;

    this.init();
  }

  static init(node) {
    const config = node.config;
    return new ZMQ({
      node: node,
      logger: node.logger,
      pubHashBlock: config.str(['zmq-hashblock', 'zmq-pub-hashblock']),
      pubRawBlock: config.str(['zmq-rawblock', 'zmq-pub-rawblock']),
      pubHashTX: config.str(['zmq-hashtx', 'zmq-pub-hashtx']),
      pubRawTX: config.str(['zmq-rawtx', 'zmq-pub-rawtx'])
    });
  }

  init() {
    const options = this.options;

    if (options.pubHashBlock)
      this.sockets.add('hashblock', options.pubHashBlock);

    if (options.pubRawBlock)
      this.sockets.add('rawblock', options.pubRawBlock);

    if (options.pubHashTX)
      this.sockets.add('hashtx', options.pubHashTX);

    if (options.pubRawTX)
      this.sockets.add('rawtx', options.pubRawTX);

    this.node.on('tx', (tx) => {
      if (this.closed)
        return;

      this.sockets.send('hashtx', reverse(tx.hash()));
      this.sockets.send('rawtx', tx.toRaw());
    });

    this.node.on('block', (block) => {
      if (this.closed)
        return;

      this.sockets.send('hashblock', reverse(block.hash()));
      this.sockets.send('rawblock', block.toRaw());
    });
  }

  async open() {
    this.sockets.open();
    this.closed = false;
    this.logger.info('ZeroMQ loaded.');
  }

  async close() {
    this.sockets.close();
    this.closed = true;
  }
}

/**
 * Plugin ID
 * @const {String}
 * @default
 */

ZMQ.id = 'zmq';

/**
 * Sockets
 */

class Sockets {
  constructor() {
    this.map = new Map();
    this.topics = new Map();
  }

  add(topic, addr) {
    assert(typeof topic === 'string');
    assert(typeof addr === 'string');
    assert(!this.topics.has(topic));

    if (!this.map.has(addr))
      this.map.set(addr, zmq.socket('pub'));

    this.topics.set(topic, this.map.get(addr));

    return this.map.get(addr);
  }

  get(key) {
    return this.map.get(key);
  }

  has(topic) {
    return this.topics.has(topic);
  }

  open() {
    for (const [addr, socket] of this.map)
      socket.bindSync(addr);
  }

  close() {
    for (const socket of this.map.values())
      socket.unbindSync();
  }

  send(topic, data) {
    const socket = this.topics.get(topic);

    if (!socket)
      return;

    socket.send([topic, data]);
  }
}

/*
 * Helpers
 */

function reverse(hash) {
  const data = Buffer.allocUnsafe(32);

  for (let i = 0; i < data.length; i++)
    data[i] = hash[31 - i];

  return data;
}

/*
 * Expose
 */

module.exports = ZMQ;
