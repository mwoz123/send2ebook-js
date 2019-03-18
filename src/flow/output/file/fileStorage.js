const fs = require("fs")

module.exports = class LocalFileStorage {

    save(stream, filePath) {
        console.log('Saving file to disk : ' + filePath);
        const writeStream = fs.createWriteStream(filePath);
        stream.pipe(writeStream)
    }

}
