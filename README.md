# bcoin-zmq

bcoin-zmq is a [bcoin][bcoin] plugin which adds bitcoind-style ZeroMQ events to
bcoin.

## Usage

When used with bcoin, it exposes several zmq flags:

``` bash
$ bcoin --plugins bcoin-zmq \
  --zmq-pub-hashblock=tcp://127.0.0.1:43332 \
  --zmq-pub-rawblock=tcp://127.0.0.1:43332 \
  --zmq-pub-hashtx=tcp://127.0.0.1:43332 \
  --zmq-pub-rawtx=tcp://127.0.0.1:43332
```

## Contribution and License Agreement

If you contribute code to this project, you are implicitly allowing your code
to be distributed under the MIT license. You are also implicitly verifying that
all code is your original work. `</legalese>`

## License

Copyright (c) 2017, Christopher Jeffrey (MIT License).

See LICENSE for more info.

[bcoin]: https://github.com/bcoin-org/bcoin
