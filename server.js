"use strict";

let PORT = process.env.PORT || 3000;

//noinspection JSUnusedLocalSymbols
let express = require('express'),
  morgan = require('morgan'),
  q = require('q'),
  queryUtils = require('./queryUtils'),
  aws = require('aws-sdk');

aws.config.update({region: 'us-west-2'}); // Oregon

let app = express();

app.use(morgan('dev'));
app.use(express.static(__dirname + '/www'));

app.get('/queryList', (req, res) => {
  res.send(JSON.stringify(queryUtils.enum));
  res.end();
});

app.get('/query/:id/:param?', (req, res) => {
  console.log(req.params);

  queryUtils.handler(req.params)
    .then(results => {
      res.json(results).end();
    });
});

app.get('/top100/:id/:param?', (req, res) => {
  queryUtils.top100(req.params)
    .then(results => {
      res.json(results).end();
    })
});

app.listen(PORT, () => console.log(`Listening on port http://localhost:${PORT}`));
