const FtpStorage = require("./output/ftp/ftpStorage")
const ToEpubConverter = require('./converter/toEpubConverter');
const DuplexStream = require('./model/duplexStream');
const UrlInputProcessor = require('./input/urlInputProcessor');
const { merge, tap } = require("rxjs/operators")

module.exports = class Send2Ebook {

  constructor({ host, user, pass, port = 21, folder = "/" }) {
    this.connectionSettings = {
      host, user, password: pass, port, folder
    }
  }

  async process([...urls], outputname) {

    const errors = new Map();

    const urlInputProcessor = new UrlInputProcessor();

    const data = urlInputProcessor.gatherEbookData(urls, errors);
    data.pipe(tap(console.log)
      )
      .subscribe(epubData => {
        errors.forEach((err, url) => console.error(`Error: '${err}' occured for url: ${url}`));

        if (epubData.content.length > 0) {

          this.obtainTitle(outputname, epubData);

          this.convertToEpubAndSaveToFtp(epubData);
        } else {
          throw ("Can't create Epub without context.");
        }
      });
  }

  obtainTitle(outputname, epubData) {
    epubData.title = outputname || epubData.title || this.titleFromDate();
  }

  titleFromDate() {
    return new Date().toISOString().substr(0, 19).replace("T", "_").replace(/[:]/gi, ".");
  }

  async convertToEpubAndSaveToFtp(epubData) {

    const duplexStream = new DuplexStream();
    try {
      const converter = new ToEpubConverter();
      await converter.convert(epubData, duplexStream);
      const fileName = this.sanitarizeName(epubData.title) + epubData.fileExt;
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
      await ftpStorage.save(stream, remotePath)

    }
    catch (err) {
      throw err;
    }
    ftpStorage.disconnect();
  }
}

