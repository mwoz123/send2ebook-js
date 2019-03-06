const ftp = require("basic-ftp")
const fs = require("fs");
const { JSDOM } = require("jsdom");
const axios = require('axios');
const sanitizeHtml = require('sanitize-html');
const absolutify = require('absolutify')
const URL = require('url');
const { tidy } = require('htmltidy2');
const EpubConverter = require('./converter/epubConverter');
const DuplexStream = require('./model/duplexStream');

class Send2Ebook {

  constructor({ host, user, pass, port = 21, folder = "/" }) {
    this.connectionSettings = {
      host, user, password: pass, port, folder
    }
  }


  async process([...urls], outputname) {

    const fileExt = ".epub";
    const errors = new Map();
    const data = {
      author: "Send2Ebook",
      title : outputname,
      content: []
    }

    await this.gatherEbookData(urls, outputname, data, errors);

    errors.forEach((err, url) => console.error(`Error: '${err}' occured for url: ${url}`));

    if (data.content.length > 0) {

      this.obtainTitle(outputname, data);

      this.createEbookSaveToFtp(data, fileExt);
    } else {
      throw ("Can't create Epub without context.");
    }
  }

  obtainTitle(outputname, data) {
    data.title = outputname ? outputname : this.titleFromDate;
  }

  titleFromDate() {
    return new Date().toISOString().substr(0, 19).replace("T", "_").replace(/[:]/gi, ".");
  }

  async createEbookSaveToFtp(data, fileExt) {
    const fileName = this.sanitarizeName(data.title) + fileExt;
    const duplexStream = new DuplexStream();
    try {
      const converter = new EpubConverter();
      await converter.convert(data, duplexStream);
      await this.saveToFtp(duplexStream, fileName);
    }
    catch (err) {
      throw err;
    }
  }

  async gatherEbookData(urls, outputname, data, errors) {

    await Promise.all(urls.map(async (url) => {
      console.log(`Processing: ${url}`);
      try {
        const response = await axios.get(url);
        const dom = new JSDOM(response.data);
        const docTitle = dom.window.document.head.querySelector("title").text;

        this.ifNoOutputnameAndSingleUrlThenUseHtmlTitleAsFilename(urls, outputname, data, docTitle);

        const cleanedHtml = await this.sanitarizeData(url, response);
        data.content.push({
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

  ifNoOutputnameAndSingleUrlThenUseHtmlTitleAsFilename(urls, outputname, data, docTitle) {
    if (urls.length == 1 && !outputname) {
      data.title = docTitle;
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


  async saveToFtp(stream, fileName) {
    console.log("saving to ftp " + this.connectionSettings.host);
    const remotePath = this.connectionSettings.folder + fileName;

    const ftpClient = new ftp.Client()
    ftpClient.ftp.verbose = true
    try {
      await ftpClient.access(this.connectionSettings)
      await ftpClient.upload(stream, remotePath)
      console.log('file succesfully send to ftp ');
    }
    catch (err) {
      console.log(err);
    }
    ftpClient.close();
  }
}

module.exports = Send2Ebook;
