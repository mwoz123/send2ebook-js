const FtpStorage = require("./output/ftp/ftpStorage")
const ToEpubConverter = require('./converter/toEpubConverter');
const DuplexStream = require('./model/duplexStream');
const UrlInputProcessor = require('./input/urlInputProcessor');
const { toArray } = require("rxjs/operators");
module.exports = class Send2Ebook {

  constructor({ host, user, pass, port = 21, folder = "/" }) {
    this.connectionSettings = {
      host, user, password: pass, port, folder
    }
  }


  async process([...urls], outputname) {

    const urlInputProcessor = new UrlInputProcessor();
    const chapterDataSubject$ = urlInputProcessor.gatherEbookData(urls);

    chapterDataSubject$.pipe(
      toArray(),
    ).subscribe(epubData => {

      epubData.title = outputname;

      if (epubData.length > 0) {

        this.convertToEpubAndSaveToFtp(epubData);
      } else {
        throw ("Can't create Epub without context.");
      }
    });
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

