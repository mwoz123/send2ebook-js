const ftp = require("basic-ftp")

module.exports = class FtpStorage {

    constructor(options) {
        this.connectionSettings = options.connectionSettings;
        this.ftpClient = new ftp.Client();
        this.ftpClient.ftp.verbose = true;
    }

    async connect() {
        await this.ftpClient.access(this.connectionSettings)
    }

    async save(stream, fileName) {

        console.log("Saving to FTP " + this.connectionSettings.host);
        const remotePath = this.connectionSettings.folder + "/" + fileName;

        await this.ftpClient.upload(stream, remotePath).then(
            () => console.log('File succesfully send to ftp '),
            err => console.error("Couldn't save file to FTP : " + err))

    }

    disconnect() {
        console.log("disconnecting from ftp")
        this.ftpClient.close();
    }
}
