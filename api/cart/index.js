(function (){
  'use strict';

  var newrelic     = require('newrelic')
    , async     = require("async")
    , express   = require("express")
    , request   = require("request")
    , helpers   = require("../../helpers")
    , endpoints = require("../endpoints")
    , app       = express()
  
  app.locals.newrelic = newrelic;
  // List items in cart for current logged in user.
  app.get("/cart", function (req, res, next) {
    console.log("Request received: " + req.url + ", " + req.query.custId);
    var custId = helpers.getCustomerId(req, app.get("env"));
    console.log("Customer ID: " + custId);
    request(endpoints.cartsUrl + "/" + custId + "/items", function (error, response, body) {
      if (error) {
        return next(error);
      }
      helpers.respondStatusBody(res, response.statusCode, body)
    });
  });

  // Delete cart
  app.delete("/cart", function (req, res, next) {
    var custId = helpers.getCustomerId(req, app.get("env"));
    console.log('Attempting to delete cart for user: ' + custId);
    var options = {
      uri: endpoints.cartsUrl + "/" + custId,
      method: 'DELETE'
    };
    request(options, function (error, response, body) {
      if (error) {
        return next(error);
      }
      console.log('User cart deleted with status: ' + response.statusCode);
      helpers.respondStatus(res, response.statusCode);
    });
  });

  // Delete item from cart
  app.delete("/cart/:id", function (req, res, next) {
    if (req.params.id == null) {
      return next(new Error("Must pass id of item to delete"), 400);
    }

    console.log("Delete item from cart: " + req.url);

    var custId = helpers.getCustomerId(req, app.get("env"));

    var options = {
      uri: endpoints.cartsUrl + "/" + custId + "/items/" + req.params.id.toString(),
      method: 'DELETE'
    };
    request(options, function (error, response, body) {
      if (error) {
        return next(error);
      }
      console.log('Item deleted with status: ' + response.statusCode);
      helpers.respondStatus(res, response.statusCode);
    });
  });

  // Add new item to cart
  app.post("/cart", function (req, res, next) {
    console.log("Attempting to add to cart: " + JSON.stringify(req.body));

    if (req.body.id == null) {
      next(new Error("Must pass id of item to add"), 400);
      return;
    }

    var custId = helpers.getCustomerId(req, app.get("env"));

    const headersObject = {}
    async.waterfall([
        function (callback) {
          newrelic.startBackgroundTransaction('Get catalogue', function executeTransaction() {
            const transaction = newrelic.getTransaction();
            transaction.insertDistributedTraceHeaders(headersObject);
            request(endpoints.catalogueUrl + "/catalogue/" + req.body.id.toString(), function (error, response, body) {
              try {
                callback(null, JSON.parse(body));
              } catch (e) {
                  callback(e);
                  return;
              }
            });
          });
        },
        function (item, callback) {
          var options = {
            uri: endpoints.cartsUrl + "/" + custId + "/items",
            method: 'POST',
            json: true,
            body: {itemId: item.id, unitPrice: item.price}
          };
          newrelic.startBackgroundTransaction('Post to cart ', function executeTransaction() {
            const transaction = newrelic.getTransaction();
            transaction.insertDistributedTraceHeaders(headersObject);
            console.log("POST to carts: " + options.uri + " body: " + JSON.stringify(options.body));
            request(options, function (error, response, body) {
              if (error) {
                callback(error)
                  return;
              }
              callback(null, response.statusCode);
            });
          });
        }
    ], function (err, statusCode) {
      if (err) {
        return next(err);
      }
      if (statusCode != 201) {
        return next(new Error("Unable to add to cart. Status code: " + statusCode))
      }
      helpers.respondStatus(res, statusCode);
    });
  });

// Update cart item
  app.post("/cart/update", function (req, res, next) {
    console.log("Attempting to update cart item: " + JSON.stringify(req.body));
    
    if (req.body.id == null) {
      next(new Error("Must pass id of item to update"), 400);
      return;
    }
    if (req.body.quantity == null) {
      next(new Error("Must pass quantity to update"), 400);
      return;
    }
    var custId = helpers.getCustomerId(req, app.get("env"));

    const headersObject = {}
    async.waterfall([
        function (callback) {
          newrelic.startBackgroundTransaction('Get catalogue', function executeTransaction() {
            const transaction = newrelic.getTransaction()
            transaction.insertDistributedTraceHeaders(headersObject);
            request(endpoints.catalogueUrl + "/catalogue/" + req.body.id.toString(), function (error, response, body) {
              console.log(body);
              callback(error, JSON.parse(body));
            });
          });
        },
        function (item, callback) {
          var options = {
            uri: endpoints.cartsUrl + "/" + custId + "/items",
            method: 'PATCH',
            json: true,
            body: {itemId: item.id, quantity: parseInt(req.body.quantity), unitPrice: item.price}
          };
          newrelic.startBackgroundTransaction('Patch to carts', function executeTransaction() {
            const transaction = newrelic.getTransaction()
            transaction.insertDistributedTraceHeaders(headersObject);
            console.log("PATCH to carts: " + options.uri + " body: " + JSON.stringify(options.body));
            request(options, function (error, response, body) {
              if (error) {
                callback(error)
                  return;
              }
              callback(null, response.statusCode);
            });
          });
        }
    ], function (err, statusCode) {
      if (err) {
        return next(err);
      }
      if (statusCode != 202) {
        return next(new Error("Unable to add to cart. Status code: " + statusCode))
      }
      helpers.respondStatus(res, statusCode);
    });
  });
  
  module.exports = app;
}());
