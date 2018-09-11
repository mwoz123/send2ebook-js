const jsftp = require("jsftp");
const fs = require("fs");

const { JSDOM } = require("jsdom");
const axios = require('axios');
const sanitizeHtml = require('sanitize-html');
const Epub = require("epub-gen")
const absolutify = require('absolutify')
const URL = require('url');


class Send2Ebook {



  process(url, { host, port, user, pass, folder }) {


    axios.get(url)
      .then(response => {



        const cleanedHTML = this.sanitarizeData(url, response);

        const dom = new JSDOM(cleanedHTML);
        const docTitle = dom.window.document.head.querySelector("title").text;

        const saveName = this.sanitarizeName(docTitle);

        this.convertToEpub(cleanedHTML, { host, port, user, pass, folder }, saveName);
        

      })
      .catch(error => {
        console.log(error);
      });
  }



  sanitarizeData(url, response) {
    const location = URL.parse(url);
    const site = `${location.protocol}//${location.host}`;
    var parsed = absolutify(response.data, site);

    parsed = parsed.replace(/src=\'\/\//gm, `src='http://`);

    parsed = parsed.replace(/src=\"\/\//gm, `src='http://`);

    const dom = new JSDOM(parsed);
    const cleanedHTML = sanitizeHtml(parsed, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'html', 'body', 'head', 'title']),
      preserveDoctypes: true
    });
    return cleanedHTML;
  }

  sanitarizeName(str) {
    return str.replace(/[^\w\s]/gm, "_");
  }

  convertToEpub(data, { host, port, user, pass, folder }, saveName) {
    var option = {
      title: saveName,
      author: "Send2Ebook",
      content: [
        {
          data
        },
      ]
    };
    const localFileName = saveName + ".epub";
    new Epub(option, localFileName).promise.then(
      (x) => {
        console.log("done epub " + x);

        const remotePath = `${folder}/${localFileName}`
        const ftp = new jsftp({ host, port, user, pass });
        ftp.put(localFileName, remotePath, function (err) {
            if (err)
              throw err
            console.log(`succesfully send to ${host}`);
            ftp.destroy();

            fs.unlink(localFileName, (err) => {
              if (err) throw err;
              console.log(`${localFileName} was removed from local filesystem`);
            });
          });

    },
      (y) => console.log("error creating Epub " + y));
  }
}

module.exports = Send2Ebook;