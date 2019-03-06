const FtpStorage = require("./output/ftp/ftpStorage")
const ToEpubConverter = require('./converter/toEpubConverter');
const DuplexStream = require('./model/duplexStream');
const UrlInputProcessor = require('./input/urlInputProcessor');
class Send2Ebook {

  constructor({ host, user, pass, port = 21, folder = "/" }) {
    this.connectionSettings = {
      host, user, password: pass, port, folder
    }
  }


  async process([...urls], outputname) {

    const fileExt = ".epub";
    const errors = new Map();
    const data = {
      author: "Send2Ebook",
      title: outputname,
      content: []
    }

    const urlInputProcessor = new UrlInputProcessor();
    await urlInputProcessor.gatherEbookData(urls, data, errors);

    errors.forEach((err, url) => console.error(`Error: '${err}' occured for url: ${url}`));

    if (data.content.length > 0) {

      this.obtainTitle(outputname, data);

      this.convertToEpubAndSaveToFtp(data, fileExt);
    } else {
      throw ("Can't create Epub without context.");
    }
  }

  obtainTitle(outputname, data) {
    data.title = outputname ? outputname : this.titleFromDate;
  }

  titleFromDate() {
    return new Date().toISOString().substr(0, 19).replace("T", "_").replace(/[:]/gi, ".");
  }

  async convertToEpubAndSaveToFtp(data, fileExt) {
    const fileName = this.sanitarizeName(data.title) + fileExt;
    const duplexStream = new DuplexStream();
    try {
      const converter = new ToEpubConverter();
      await converter.convert(data, duplexStream);
      await this.saveOutput(duplexStream, fileName);
    }
    catch (err) {
      throw err;
    }
  }

  sanitarizeName(str) {
    return str.replace(/[^\w\s]/gm, "_");
  }

  async saveOutput(stream, fileName) {
    console.log("saving to ftp " + this.connectionSettings.host);
    const remotePath = this.connectionSettings.folder + "/" + fileName;

    const ftpStorage = new FtpStorage()
    try {
      await ftpStorage.connect(this.connectionSettings)
      await ftpStorage.upload(stream, remotePath)

    }
    catch (err) {
      throw err;
    }
    ftpStorage.disconnect();
  }
}

module.exports = Send2Ebook;
