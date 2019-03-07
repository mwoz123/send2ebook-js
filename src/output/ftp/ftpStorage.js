const ftp = require("basic-ftp")

module.exports = class FtpStorage {

    constructor() {
        this.ftpClient = new ftp.Client();
    }

    async connect(connectionSettings) {
        this.ftpClient.ftp.verbose = true;
        await this.ftpClient.access(connectionSettings)
    }

    async save(stream, remotePath) {
        await this.ftpClient.upload(stream, remotePath)
        console.log('file succesfully send to ftp ');
    }

    disconnect() {
        this.ftpClient.close();
    }
}
