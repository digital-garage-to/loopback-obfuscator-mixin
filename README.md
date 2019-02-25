[![tag][tag-image]][tag-url]
[![Build Status][travis-image]][travis-url]
[![Coverage Status][coverage-image]][coverage-url]
[![MIT license](http://img.shields.io/badge/license-MIT-brightgreen.svg)](#license)
<br>
[![npm][npm-image]][npm-url]
[![npm downloads][npm-downloads-image]][npm-downloads-url]
[![dependencies][dep-status-image]][dep-status-url]
[![devDependency][dev-dep-status-image]][dev-dep-status-url]


loopback-obfuscator-mixin
=========================

This module is designed for the [Strongloop Loopback](https://github.com/strongloop/loopback) framework.
It obfuscates the specified properties inside any Model with [`hashids`](https://hashids.org).

Installation
=============

```bash
  npm install --save @digital-garage/loopback-obfuscator-mixin
```

Usage
=========

Any property that is set as obfuscated will be obfuscated and deobfuscated properly any time you use any `PersistedModel` method

__Keep in mind that if you obfuscate any foreign key you can't directly use include filters, you will need to use 2 separated queries__

Mixin Sources
==============

Add the `mixins` property to your `server/model-config.json` like the following:

```json
{
  "_meta": {
    "sources": [
      "loopback/common/models",
      "loopback/server/models",
      "../common/models",
      "./models"
    ],
    "mixins": [
      "loopback/common/mixins",
      "../node_modules/@digitalgarage/loopback-obfuscator-mixin/lib",
      "../common/mixins"
    ]
  }
}
```

Config
==========

To use with your Models add the `mixins` attribute to the definition object of your model config.

```json
  {
    "name": "Friend",
    "properties": {
      "label": {
        "type": "string",
        "obfuscated": true
      }
    },
    "mixins": {
      "Obfuscator" : {
        "salt": "RANDOM_SALT"
      }
    }
  }
```

Alternatively you can also define the obfuscated properties inside the mixin options like this

```json
  {
    "name": "Friend",
    "properties": {
      "label": {
        "type": "string"
      }
    },
    "mixins": {
      "Obfuscator" : {
        "salt": "RANDOM_SALT",
        "properties": ["label"]
      }
    }
  }
```

Testing
=============

This package uses `Typescript` and `ts-jest` to help maintain style and for error checking.

Run the tests in the `test` directory.

```bash
  npm test
```

Run with debugging output on:

```bash
  DEBUG='loopback:mixin:obfuscator' npm test
```


License
============
[MIT](LICENSE)

[tag-image]: https://img.shields.io/github/tag/digital-garage-to/loopback-obfuscator-mixin.svg
[tag-url]: https://github.com/digital-garage-to/loopback-obfuscator-mixin/releases
[travis-image]: https://travis-ci.org/digital-garage-to/loopback-obfuscator-mixin.svg?branch=master
[travis-url]: https://travis-ci.org/digital-garage-to/loopback-obfuscator-mixin?branch=master
[coverage-image]: https://coveralls.io/repos/github/digital-garage-to/loopback-obfuscator-mixin/badge.svg?branch=master
[coverage-url]: https://coveralls.io/github/digital-garage-to/loopback-obfuscator-mixin?branch=master

[npm-image]: https://img.shields.io/npm/v/@digitalgarage/loopback-obfuscator-mixin.svg
[npm-url]: https://npmjs.org/package/@digitalgarage/loopback-obfuscator-mixin
[npm-downloads-image]: https://img.shields.io/npm/dm/@digitalgarage/loopback-obfuscator-mixin.svg
[npm-downloads-url]: https://npmjs.org/package/@digitalgarage/loopback-obfuscator-mixin
[dep-status-image]: https://img.shields.io/david/digital-garage-to/loopback-obfuscator-mixin.svg
[dep-status-url]: https://david-dm.org/digital-garage-to/loopback-obfuscator-mixin
[dev-dep-status-image]: https://david-dm.org/digital-garage-to/loopback-obfuscator-mixin/dev-status.svg
[dev-dep-status-url]: https://david-dm.org/digital-garage-to/loopback-obfuscator-mixin?type=dev