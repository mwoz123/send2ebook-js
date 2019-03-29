const UrlInputProcessor = require('./src/flow/input/urlInputProcessor');
const ToEpubConverter = require('./src/flow/converter/toEpubConverter');
const FtpStorage = require('./src/flow/output/ftp/ftpStorage');
const FileStorage = require('./src/flow/output/file/fileStorage');
const NameSanitarizer = require('./src/util/nameSanitarizer');
const DuplexStream = require('./src/model/duplexStream');
const Send2Ebook = require('./src/send2ebook');
const Send2EbookRssAtom = require('./src/send2ebook-rss-atom')


module.exports = {
    UrlInputProcessor,

    ToEpubConverter,

    FtpStorage,
    FileStorage,

    DuplexStream,
    NameSanitarizer,

    Send2Ebook,
    Send2EbookRssAtom,
}