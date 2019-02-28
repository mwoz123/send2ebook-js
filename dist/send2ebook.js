"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// import { Map } from 'Map';
// import { jsftp } from 'js';
// import { jsftp } from 'jsftp';
// const jsftp  = require("jsftp");
// const fs = require("fs");
const { JSDOM } = require("jsdom");
const axios = require('axios');
const sanitizeHtml = require('sanitize-html');
const Epub = require("epub-gen");
const absolutify = require('absolutify');
const urlParser = require('url');
const tidy = require('htmltidy2').tidy;
// import { Observable } from 'rxjs/Observable';
require("rxjs/add/observable/from");
const jsftp_1 = __importDefault(require("jsftp"));
const fs_1 = __importDefault(require("fs"));
class Send2Ebook {
    constructor({ host, user, pass, port = 21, folder = "/" }) {
        this.connectionSettings = {
            host, user, pass, port, folder
        };
    }
    process([...urls], outputname) {
        return __awaiter(this, void 0, void 0, function* () {
            const fileExt = ".epub";
            const errors = new Map();
            const option = {
                author: "Send2Ebook",
                content: []
            };
            // Observable.of(urls).subs
            yield this.gatherEbookData(urls, outputname, option, errors);
            errors.forEach((err, url) => console.error(`Error: '${err}' occured for url: ${url}`));
            if (option.content.length > 0) {
                this.obtainTitle(outputname, option);
                this.createEbookSaveToFtp(option, fileExt);
            }
            else {
                throw ("Can't create Epub without context.");
            }
        });
    }
    obtainTitle(outputname, option) {
        option.title = outputname ? outputname : this.titleFromDate;
    }
    titleFromDate() {
        return new Date().toISOString().substr(0, 19).replace("T", "_").replace(/[:]/gi, ".");
    }
    createEbookSaveToFtp(option, fileExt) {
        return __awaiter(this, void 0, void 0, function* () {
            const localFileName = this.sanitarizeName(option.title) + fileExt;
            try {
                yield new Epub(option, localFileName).promise;
                this.saveToFtpAndRemoveFromDisk(localFileName);
            }
            catch (err) {
                throw err;
            }
        });
    }
    gatherEbookData(urls, outputname, option, errors) {
        return __awaiter(this, void 0, void 0, function* () {
            // Observable.from(urls).
            yield Promise.all(urls.map((url) => __awaiter(this, void 0, void 0, function* () {
                console.log(`Processing: ${url}`);
                try {
                    const response = yield axios.get(url);
                    const dom = new JSDOM(response.data);
                    const docTitle = dom.window.document.head.querySelector("title").text;
                    this.ifNoOutputnameAndSingleUrlThenUseHtmlTitleAsFilename(urls, outputname, option, docTitle);
                    const cleanedHtml = yield this.sanitarizeData(url, response);
                    option.content.push({
                        title: docTitle,
                        data: cleanedHtml,
                        author: url
                    });
                }
                catch (err) {
                    errors.set(url, err);
                }
            })));
        });
    }
    ifNoOutputnameAndSingleUrlThenUseHtmlTitleAsFilename(urls, outputname, option, docTitle) {
        if (urls.length == 1 && !outputname) {
            option.title = docTitle;
        }
    }
    sanitarizeData(url, response) {
        return __awaiter(this, void 0, void 0, function* () {
            const location = urlParser.parse(url);
            const site = `${location.protocol}//${location.host}`;
            let parsed = absolutify(response.data, site);
            parsed = parsed.replace(/src=\'\/\//gm, `src='http://`);
            parsed = parsed.replace(/src=\"\/\//gm, `src='http://`);
            const cleanedHtml = yield sanitizeHtml(parsed, {
                allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'html', 'body', 'head', 'title', 'article', 'style']),
                preserveDoctypes: true,
                allowProtocolRelative: false,
                exclusiveFilter: function (frame) {
                    return frame.tag === 'img' && !frame.attribs.src; //fix exception when empty <img /> 
                }
            });
            const validHtml = yield new Promise((resolve, reject) => {
                tidy(cleanedHtml, (err, html) => __awaiter(this, void 0, void 0, function* () {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(html);
                    }
                }));
            });
            return validHtml;
        });
    }
    sanitarizeName(str) {
        return str.replace(/[^\w\s]/gm, "_");
    }
    saveToFtpAndRemoveFromDisk(localFileName) {
        console.log("saving to ftp " + this.connectionSettings.host);
        const remotePath = this.connectionSettings.folder + localFileName;
        const ftp = new jsftp_1.default(this.connectionSettings);
        ftp.put(localFileName, remotePath, function (err) {
            if (err)
                throw err;
            console.log('succesfully send to ftp ');
            ftp.destroy();
            fs_1.default.unlink(localFileName, (err) => {
                if (err)
                    throw err;
                console.log(localFileName + ' was removed from local filesystem');
            });
        });
    }
}
exports.Send2Ebook = Send2Ebook;
