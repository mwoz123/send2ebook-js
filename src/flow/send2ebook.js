const FtpStorage = require("./output/ftp/ftpStorage")
const ToEpubConverter = require('./converter/toEpubConverter');
const DuplexStream = require('../model/duplexStream');
const UrlInputProcessor = require('./input/urlInputProcessor');
const { toArray } = require("rxjs/operators");
const NameSanitarizer = require("../util/nameSanitarizer");


module.exports = class Send2Ebook {

  constructor(options) {
    this.options = options;
  }


  async process([...urls], outputname) {

    const urlInputProcessor = new UrlInputProcessor(this.options);
    const chapterDataSubject$ = urlInputProcessor.gatherEbookData(urls);

    chapterDataSubject$.pipe(
      toArray(),
    ).subscribe(epubData => {

      epubData.title = outputname;

      if (epubData.length > 0) {

        this.convertToEpubAndSaveToFtp(epubData);
      } else {
        console.error("Can't create Epub without context.");
      }
    });
  }


  async convertToEpubAndSaveToFtp(epubData) {

    const duplexStream = new DuplexStream();
    try {
      const converter = new ToEpubConverter(this.options);
      await converter.convert(epubData, duplexStream);

      const fileName = new NameSanitarizer().sanitarizeName(epubData.title) + epubData.fileExt;

      // await this.saveOutput(duplexStream, fileName);
      const LocalFileStorage = require("./output/file/fileStorage")
      new LocalFileStorage().save(duplexStream, fileName);
    }
    catch (err) {
      throw err;
    }
  }



  async saveOutput(stream, fileName) {

    const ftpStorage = new FtpStorage(this.options)
    try {
      await ftpStorage.connect()
      await ftpStorage.save(stream, fileName)
    }
    catch (err) {
      throw err;
    }
    ftpStorage.disconnect();
  }
}

