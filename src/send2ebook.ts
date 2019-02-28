// const { JSDOM } = require("jsdom");
import { JSDOM } from "jsdom";
// const axios = require('axios');
import axios from "axios";
const sanitizeHtml = require('sanitize-html');
const Epub = require("epub-gen")
const absolutify = require('absolutify')
const urlParser = require('url');
const tidy = require('htmltidy2').tidy;

import { range, Observable, from } from 'rxjs';
// import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/from';
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


  async process(urls: [], outputname: string) {
    const fileExt = ".epub";

    const errors = new Map();
    const option = {
      author: "Send2Ebook",
      content: []
    }

    // Observable.of(urls).subs

    await this.gatherEbookData(urls, outputname, option, errors);

    errors.forEach((err: string, url: string) => console.error(`Error: '${err}' occured for url: ${url}`));

    if (option.content.length > 0) {

      this.obtainTitle(outputname, option);

      this.createEbookSaveToFtp(option, fileExt);
    } else {
      throw ("Can't create Epub without context.");
    }
  }

  obtainTitle(outputname: string, option) {
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

  async gatherEbookData(urls: [], outputname, option, errors) {

    const responses$ = from(urls).pipe(
      flatMap(url => axios.get(url)),
      map(resp => resp.data)
    );

    const dom$ = responses$.pipe(map(resp => new JSDOM(resp.data)));
    const title$ = dom$.pipe(map(dom => dom.window.document.title));
    // const sanitzedTitle$ = title$.pipe(map())



    await Promise.all(urls.map(async (url) => {
      console.log(`Processing: ${url}`);
      try {
        const response = await axios.get(url);
        const dom = new JSDOM(response.data);
        const docTitle = dom.window.document.title;

        this.ifNoOutputnameAndSingleUrlThenUseHtmlTitleAsFilename(urls, outputname, option, docTitle);

        const cleanedHtml = await this.sanitarizeData(url, response);
        option.content.push({
          title: docTitle,
          data: cleanedHtml,
          author: url
        });
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

  async sanitarizeData(url, response) {
    const location = urlParser.parse(url);
    const site = `${location.protocol}//${location.host}`;
    let parsed = absolutify(response.data, site);

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
    
    const cleanedHtml = await sanitizeHtml(parsed, sanitarizeOptions );


    const validHtml = await new Promise((resolve, reject) => {
      tidy(cleanedHtml, async (err, html) => {
        if (err) {
          reject(err);
        } else {
          resolve(html);
        }
      });
    });
    return validHtml;
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
