const jsftp = require("jsftp");
const fs = require("fs");
const { JSDOM } = require("jsdom");
const axios = require('axios');
const sanitizeHtml = require('sanitize-html');
const Epub = require("epub-gen")
const absolutify = require('absolutify')
const URL = require('url');


const fileExt = ".epub";

class Send2Ebook {

  constructor({ host, user, pass, port = 21, folder = "/" }) {
    this.host = host;
    this.user = user;
    this.pass = pass;
    this.port = port;
    this.folder = folder;
  }


  async process([...urls], outputname) {

    const errors = new Map();
    const option = {
      author: "Send2Ebook",
      content: []
    }

    await Promise.all(urls.map(async (url) => {

      console.log(`Processing: ${url}`);
      try {
        const response = await axios.get(url);
        const dom = new JSDOM(response.data);
        const docTitle = dom.window.document.head.querySelector("title").text;

        if (urls.length == 1 && !outputname) {
          option.title = docTitle;
        }

        const cleanedHtml = await this.sanitarizeData(url, response);

        option.content.push({
          title: docTitle,
          data: cleanedHtml,
          author: url
        })
      } catch (err) {
        errors.set(url, err);
      }
    }));

    errors.forEach((err, url) => console.error(`Error: '${err}' occured for url: ${url}`));

    if (option.content.length > 0) {

      if (outputname) {
        option.title = outputname;
      } else if (!option.title) {
        option.title = new Date().toISOString().substr(0, 19).replace("T", "_").replace(/[:]/gi, ".");
      }


      const localFileName = this.sanitarizeName(option.title) + fileExt;
      try {
        await new Epub(option, localFileName).promise;
        this.saveToFtpAndRemoveFromDisk(localFileName);
      } catch (err) {
        throw err;
      }
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
    return cleanedHtml;
  }

  sanitarizeName(str) {
    return str.replace(/[^\w\s]/gm, "_");
  }


  saveToFtpAndRemoveFromDisk(localFileName) {
    console.log("saving to ftp " + this.host);
    const remotePath = this.folder + localFileName;
    // let localFileName = this.localFileName;
    const ftp = new jsftp({ host: this.host, port: this.port, user: this.user, pass: this.pass });
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
