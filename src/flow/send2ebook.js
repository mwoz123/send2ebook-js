const FtpStorage = require("./output/ftp/ftpStorage")
// const LocalFileStorage = require("./output/file/fileStorage")
const ToEpubConverter = require('./converter/toEpubConverter');
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

    const converter = new ToEpubConverter(this.options);
    const duplexStream = await converter.convert(epubData);
    
    const fileName = new NameSanitarizer().sanitarizeName(epubData.title) + epubData.fileExt;

    // new LocalFileStorage().save(duplexStream, fileName);
    await this.saveOutput(duplexStream, fileName);
  }



  async saveOutput(stream, fileName) {

    const ftpStorage = new FtpStorage(this.options);
    try {
      await ftpStorage.connect();
      await ftpStorage.save(stream, fileName);
    }
    catch (err) {
      console.error("FTP error: " + err);
    }
    ftpStorage.disconnect();
  }
}

