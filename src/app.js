// import { jsftp } from 'jsftp';
const jsftp = require("jsftp");

const stream = require('stream')
// const jsftp
// const fs = require('fs')


const connectionSettings ;



class DuplexStream extends stream.Duplex {

    constructor(options) {
        super(options)
        // this.total = 0;
    }

    _write(chunk, encoding, callback) {
        this.total += chunk.length
        // console.log('bytes so far: ' + this.total)
        this.push(chunk)
        callback()
    }

    _read(size) {
    }

    _final() {
        console.log(`stream complete!`)
        // ftp.destroy();
        // console.log(`stream complete!`)
    }
}


const duplexStream = new DuplexStream()

const Streampub = require('streampub')
var epub = new Streampub({ title: 'My Example' })
epub.setAuthor('Example User')
epub.pipe(duplexStream)
epub.write(Streampub.newChapter('Chapter 1', '<b>doc content</b>', 0, 'chapter-1.xhtml'))
epub.end()


// const ftp = new jsftp(connectionSettings);

// ftp.put(duplexStream, "mwoz123.cba.pl/data/test2.epub", function (err) {
//     console.log('succesfully send to ftp ');
//     if (err) {
//         ftp.destroy();
//         throw err;
//     }
//     console.log('succesfully send to ftp 2  ');
//     ftp.destroy();
// });


const ftp = require("basic-ftp")
const fs = require("fs")
 
example()
 
async function example() {
    const client = new ftp.Client()
    client.ftp.verbose = true
    try {
        await client.access(connectionSettings)
        // console.log(await client.list())
        await client.upload(duplexStream, "mwoz123.cba.pl/data/tREADME.epub")
    }
    catch(err) {
        console.log(err)
    }
    client.close()
}


duplexStream.on('end', function () {
    console.log('done111 disconecting');
    ftp.destroy();
});