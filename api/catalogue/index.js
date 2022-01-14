(function (){
  'use strict';

  var newrelic     = require('newrelic')
    , express   = require("express")
    , request   = require("request")
    , endpoints = require("../endpoints")
    , helpers   = require("../../helpers")
    , app       = express()
    , logger    = require("../../logger")

  app.locals.newrelic = newrelic;

  app.get("/catalogue/images*", function (req, res, next) {
    var url = endpoints.catalogueUrl + req.url.toString();
    var time = Math.floor(Math.random()*10) === 0 ? 5 : 0;
    logger.info(`${time} secs waiting`);    
    setTimeout(()=>{
    request.get(url)
        .on('error', function(e) { next(e); })
        .pipe(res);
    }, time*1000);
  });

  app.get("/catalogue*", function (req, res, next) {
    // バグが多いためブラウザからのリクエストをそのまま流す
    //logger.info("Request" + req.url.toString());
    //logger.info(JSON.stringify(req.query));
    //var tags = req.query['tags'] ? req.query['tags'].split(',').map(tag=>`tags[]=${tag}`).join('&') : '';
    //var params = Object.keys(req.query).filter(attr => attr !== 'tags').map(attr => `${attr}=${req.query[attr]}`).join('&');
    //var path = `${req.path}?${params}&${tags}`;
    //logger.info(path);
    //helpers.simpleHttpRequest(endpoints.catalogueUrl + path, res, next);
    helpers.simpleHttpRequest(endpoints.catalogueUrl + req.url.toString(), res, next);
  });

  app.get("/tags", function(req, res, next) {
    helpers.simpleHttpRequest(endpoints.tagsUrl, res, next);
  });

  module.exports = app;
}());
