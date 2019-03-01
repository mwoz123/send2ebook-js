import { JSDOM } from "jsdom";
import axios from "axios";
import sanitizeHtml from 'sanitize-html';
const Epub = require("epub-gen")
import absolutify from "absolutify";
const urlParser = require('url');
import { tidy } from 'htmltidy2';
// const fs = require('fs')
import { range, Observable, from, of, forkJoin, bindCallback } from 'rxjs';
// import { Observable } from 'rxjs/Observable';
import { map, filter, tap, switchMap, flatMap } from 'rxjs/operators';
import jsftp from "jsftp";
import fs from "fs";

interface ConnectionSettings {
  host: string,
  user: string,
  pass: string,
  port: number,
  folder: string
}

export class Send2Ebook {

  connectionSettings: ConnectionSettings;

  constructor({ host, user, pass, port = 21, folder = "/" }: ConnectionSettings) {
    this.connectionSettings = {
      host, user, pass, port, folder
    }
  }


  async process(urls: string[], outputname?: string) {
    const fileExt = ".epub";

    const errors = new Map();
    const option = {
      author: "Send2Ebook",
      content: []
    }

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
  }

  obtainTitle(outputname?: string, option?) {
    option.title = outputname ? outputname : this.titleFromDate;
  }

  titleFromDate() {
    return new Date().toISOString().substr(0, 19).replace("T", "_").replace(/[:]/gi, ".");
  }

  async createEbookSaveToFtp(option, fileExt: string) {
    const localFileName = this.sanitarizeName(option.title) + fileExt;
    try {
      await new Epub(option, localFileName).promise;
      this.saveToFtpAndRemoveFromDisk(localFileName);
    }
    catch (err) {
      throw err;
    }
  }

  gatherEbookData(urls: string[], outputname, option, errors): Observable<any> {

    return forkJoin(urls.map(url => {
      console.log(`Processing: ${url}`);
      try {

        const responses$ = from(urls).pipe(
          flatMap(url => axios.get(url)),
          map(resp => resp.data)
        );

        const dom$ = responses$.pipe(map(resp => new JSDOM(resp.data)));
        const title$ = dom$.pipe(map(dom => dom.window.document.title));
        title$.subscribe( x =>console.log("title" +x));   
        // const sanitzedTitle$ = title$.pipe(map())

        // const response = await axios.get(url);
        // const dom = new JSDOM(response.data);
        // const docTitle = dom.window.document.title;

        // this.ifNoOutputnameAndSingleUrlThenUseHtmlTitleAsFilename(urls, outputname, option, docTitle);

        const cleanedHtml$ = this.sanitarizeData(url, responses$);

        return cleanedHtml$.pipe(
          tap(console.log),
         flatMap(html =>
            title$.pipe(
              tap(title =>
                option.content.push({
                  title: title,
                  data: html,
                  author: url
                })))
          )
        );

      } catch (err) {
        errors.set(url, err);
      }
    }));
  }

  ifNoOutputnameAndSingleUrlThenUseHtmlTitleAsFilename(urls, outputname, option, docTitle) {
    if (urls.length == 1 && !outputname) {
      option.title = docTitle;
    }
  }
  
  
  sanitarizeData(url, response$: Observable<any>): Observable<any> {

    return response$.pipe(flatMap(
      data => {
        const location = urlParser.parse(url);
        const site = `${location.protocol}//${location.host}`;

        let parsed = absolutify(data, site);

        parsed = parsed.replace(/src=\'\/\//gm, `src='http://`);

        parsed = parsed.replace(/src=\"\/\//gm, `src='http://`);

        const sanitarizeOptions = {
          allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'html', 'body', 'head', 'title', 'article', 'style']),
          preserveDoctypes: true,
          allowProtocolRelative: false,
          exclusiveFilter: function (frame) {
            return frame.tag === 'img' && !frame.attribs.src; //fix exception when empty <img /> 
          }
        };

        const cleanedHtml = sanitizeHtml(parsed, sanitarizeOptions); 

        //FIXME: to be cleaned : 

        // const tidied = ;
        const tidy$ : any = bindCallback(tidy);
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
      }
    ));
  }

  sanitarizeName(str) {
    return str.replace(/[^\w\s]/gm, "_");
  }


  saveToFtpAndRemoveFromDisk(localFileName) {
    console.log("saving to ftp " + this.connectionSettings.host);
    const remotePath = this.connectionSettings.folder + localFileName;

    const ftp = new jsftp(this.connectionSettings);
    ftp.put(localFileName, remotePath, function (err) {
      if (err)
        throw err;
      console.log('succesfully send to ftp ');
      ftp.destroy();

      fs.unlink(localFileName, (err) => {
        if (err)
          throw err;
        console.log(localFileName + ' was removed from local filesystem');
      });
    });
  }
}
