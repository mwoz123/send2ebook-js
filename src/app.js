const { of, from, bindCallback } = require("rxjs");
const { tap, map, take, flatMap, retry, zip, switchMap } = require("rxjs/operators");
const axios = require('axios');
const { JSDOM } = require("jsdom");

const sanitizeHtml = require('sanitize-html');
const absolutify = require('absolutify')
const URL = require('url');
const { tidy } = require('htmltidy2');



const Send2Ebook = require("./send2ebook");

const connectionSettings = {
    host: "test.ftp.com",
    port: 21, // defaults to 21
    user: "mwoz123",
    pass: "abcd", // defaults to "@anonymous"
    folder: "/"
}


const urls = ["https://www.rmf24.pl/fakty/swiat/news-wenezuela-pograzona-w-ciemnosciach-kraj-bez-pradu,nId,2873306",
    'https://gazetawroclawska.pl', "https://rxmarbles.com"];

const s2e = new Send2Ebook(connectionSettings);
// s2e.process(['https://www.rmf24.pl/fakty/swiat/news-wenezuela-pograzona-w-ciemnosciach-kraj-bez-pradu,nId,2873306'] );
s2e.process(urls);

