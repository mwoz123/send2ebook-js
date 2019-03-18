const Send2Ebook = require("./flow/send2ebook");



const connectionSettings = {
    host: "test.ftp.com",
    port: 21, // defaults to 21
    user: "test",
    password: "abcd",
    folder: "/"
}

const options = { connectionSettings }


 const urls = ["https://www.learnrxjs.io" ,"https://www.rmf24.pl/fakty/swiat/news-wenezuela-pograzona-w-ciemnosciach-kraj-bez-pradu,nId,2873306",
 ];

const s2e = new Send2Ebook(options);
s2e.process(urls);

