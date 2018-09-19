'use strict';
const jsftp = require("jsftp");
const fs = require("fs");
const { JSDOM } = require("jsdom");
const axios = require('axios');
const sanitizeHtml = require('sanitize-html');
const Epub = require("epub-gen")
const absolutify = require('absolutify')
const URL = require('url');
const tidy = require('htmltidy2').tidy;

class Send2Ebook {

  constructor({ host, user, pass, port = 21, folder = "/" }) {
    this.connectionSettings = {
      host, user, pass, port, folder
    }
  }


  async process([...urls], outputname) {

    const fileExt = ".epub";
    const errors = new Map();
    const option = {
      author: "Send2Ebook",
      content: []
    }

    await this.gatherEbookData(urls, outputname, option, errors);

    errors.forEach((err, url) => console.error(`Error: '${err}' occured for url: ${url}`));

    if (option.content.length > 0) {

      this.obtainTitle(outputname, option);

      this.createEbookSaveToFtp(option, fileExt);
    }
  }




  async createEbookSaveToFtp(option, fileExt) {
    const localFileName = this.sanitarizeName(option.title) + fileExt;
    try {
      await new Epub(option, localFileName).promise;
      this.saveToFtpAndRemoveFromDisk(localFileName);
    }
    catch (err) {
      throw err;
    }
  }

  obtainTitle(outputname, option) {
    if (outputname) {
      option.title = outputname;
    }
    else if (!option.title) {
      option.title = new Date().toISOString().substr(0, 19).replace("T", "_").replace(/[:]/gi, ".");
    }
  }

  async gatherEbookData(urls, outputname, option, errors) {

    await Promise.all(urls.map(async (url) => {
      console.log(`Processing: ${url}`);
      try {
        const response = await axios.get(url);
        const dom = new JSDOM(response.data);
        const docTitle = dom.window.document.head.querySelector("title").text;

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
    const location = URL.parse(url);
    const site = `${location.protocol}//${location.host}`;
    let parsed = absolutify(response.data, site);

    parsed = parsed.replace(/src=\'\/\//gm, `src='http://`);

    parsed = parsed.replace(/src=\"\/\//gm, `src='http://`);

    const cleanedHtml = await sanitizeHtml(parsed, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'html', 'body', 'head', 'title', 'article', 'style']),
      preserveDoctypes: true,
      allowProtocolRelative: false,
      exclusiveFilter: function (frame) {
        return frame.tag === 'img' && !frame.attribs.src; //fix exception when empty <img /> 
      }
    });


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

module.exports = Send2Ebook;
