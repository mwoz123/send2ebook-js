const stream = require('stream')

class DuplexStream extends stream.Duplex {

    constructor(options) {
        super(options)
    }

    _write(chunk, encoding, callback) {
        this.total += chunk.length
        this.push(chunk)
        callback()
    }

    _read(size) {
    }

    _final() {
        console.log(`stream complete!`)
    }
}


module.exports = DuplexStream;