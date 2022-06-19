let unirest = require("unirest");
const config = require("config");

function translate(text, source, dest) {
  //500000 requests a month !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  return new Promise((resolve, reject) => {
    if (source == "be") source = "ru";
    if (dest == "be") dest = "ru";
    let req = unirest(
      "POST",
      "https://microsoft-translator-text.p.rapidapi.com/translate"
    );

    req.query({
      from: source,
      profanityAction: "NoAction",
      textType: "plain",
      to: dest,
      "api-version": "3.0",
    });

    req.headers({
      "x-rapidapi-host": "microsoft-translator-text.p.rapidapi.com",
      "x-rapidapi-key": config.get("rapidapikey"),
      "content-type": "application/json",
      accept: "application/json",
      useQueryString: true,
    });

    req.type("json");
    req.send([
      {
        Text: text,
      },
    ]);

    req.end(function (res) {
      if (res.error) {
        reject(res.error);
      } else {
        resolve(res.body[0].translations[0].text);
      }
    });
  });
}

module.exports = translate;
