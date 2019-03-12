const stream = require('stream')

module.exports = class DuplexStream extends stream.Duplex {

    constructor(options) {
        super(options)
        this.total = 0;
    }

    _write(chunk, encoding, callback) {
        this.total += chunk.length
        // console.log(this.total);
        this.push(chunk)
        callback()
    }

    _read(size) {
    }

    _final() {
        console.log(`stream complete!`)
    }
}
