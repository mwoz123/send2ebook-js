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
const jsdom_1 = require("jsdom");
const axios_1 = __importDefault(require("axios"));
const sanitize_html_1 = __importDefault(require("sanitize-html"));
const Epub = require("epub-gen");
const absolutify_1 = __importDefault(require("absolutify"));
const urlParser = require('url');
const htmltidy2_1 = require("htmltidy2");
// const fs = require('fs')
const rxjs_1 = require("rxjs");
// import { Observable } from 'rxjs/Observable';
const operators_1 = require("rxjs/operators");
const jsftp_1 = __importDefault(require("jsftp"));
const fs_1 = __importDefault(require("fs"));
class Send2Ebook {
    constructor({ host, user, pass, port = 21, folder = "/" }) {
        this.connectionSettings = {
            host, user, pass, port, folder
        };
    }
    process(urls, outputname) {
        return __awaiter(this, void 0, void 0, function* () {
            const fileExt = ".epub";
            const errors = new Map();
            const option = {
                author: "Send2Ebook",
                content: []
            };
            // Observable.of(urls).subs
            const data$ = this.gatherEbookData(urls, outputname, option, errors);
            data$.subscribe(console.log);
            // errors.forEach((err: string, url: string) => console.error(`Error: '${err}' occured for url: ${url}`));
            // if (option.content.length > 0) {
            //   this.obtainTitle(outputname, option);
            //   this.createEbookSaveToFtp(option, fileExt);
            // } else {
            //   throw ("Can't create Epub without context.");
            // }
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
        return rxjs_1.forkJoin(urls.map(url => {
            console.log(`Processing: ${url}`);
            try {
                const responses$ = rxjs_1.from(urls).pipe(operators_1.flatMap(url => axios_1.default.get(url)), operators_1.map(resp => resp.data));
                const dom$ = responses$.pipe(operators_1.map(resp => new jsdom_1.JSDOM(resp.data)));
                const title$ = dom$.pipe(operators_1.map(dom => dom.window.document.title));
                title$.subscribe(x => console.log("title" + x));
                // const sanitzedTitle$ = title$.pipe(map())
                // const response = await axios.get(url);
                // const dom = new JSDOM(response.data);
                // const docTitle = dom.window.document.title;
                // this.ifNoOutputnameAndSingleUrlThenUseHtmlTitleAsFilename(urls, outputname, option, docTitle);
                const cleanedHtml$ = this.sanitarizeData(url, responses$);
                return cleanedHtml$.pipe(operators_1.tap(console.log), operators_1.flatMap(html => title$.pipe(operators_1.tap(title => option.content.push({
                    title: title,
                    data: html,
                    author: url
                })))));
            }
            catch (err) {
                errors.set(url, err);
            }
        }));
    }
    ifNoOutputnameAndSingleUrlThenUseHtmlTitleAsFilename(urls, outputname, option, docTitle) {
        if (urls.length == 1 && !outputname) {
            option.title = docTitle;
        }
    }
    sanitarizeData(url, response$) {
        return response$.pipe(operators_1.flatMap(data => {
            const location = urlParser.parse(url);
            const site = `${location.protocol}//${location.host}`;
            let parsed = absolutify_1.default(data, site);
            parsed = parsed.replace(/src=\'\/\//gm, `src='http://`);
            parsed = parsed.replace(/src=\"\/\//gm, `src='http://`);
            const sanitarizeOptions = {
                allowedTags: sanitize_html_1.default.defaults.allowedTags.concat(['img', 'html', 'body', 'head', 'title', 'article', 'style']),
                preserveDoctypes: true,
                allowProtocolRelative: false,
                exclusiveFilter: function (frame) {
                    return frame.tag === 'img' && !frame.attribs.src; //fix exception when empty <img /> 
                }
            };
            const cleanedHtml = sanitize_html_1.default(parsed, sanitarizeOptions);
            //FIXME: not working : 
            // const tidied = ;
            const tidy$ = rxjs_1.bindCallback(htmltidy2_1.tidy);
            return tidy$(cleanedHtml);
            // return tidyCallback$();
            // return Observable.create(observer => {
            //   observer.next(tidy(cleanedHtml));
            // });
            // const validHtml$ = cleanedHtml$.pipe(map(data => tidy(data)));
            // const validHtml = await new Promise((resolve, reject) => {
            //   tidy(cleanedHtml, async (err, html) => {
            //     if (err) {
            //       reject(err);
            //     } else {
            //       resolve(html);
            //     }
            //   });
            // });
            // return of(tidied);
        }));
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
//# sourceMappingURL=send2ebook.js.map