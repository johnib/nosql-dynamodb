"use strict";

let PORT = process.env.PORT || 3000;

//noinspection JSUnusedLocalSymbols
let express = require('express'),
  morgan = require('morgan'),
  redis = require('ioredis'),
  q = require('q'),
  queryUtils = require('./queryUtils'),
  aws = require('aws-sdk');

aws.config.update({region: 'us-west-2'});

let app = express();

app.use(morgan('dev'));
app.use(express.static(__dirname + '/www'));

app.get('/queryList', (req, res) => {
  res.send(JSON.stringify(queryUtils.enum));
  res.end();
});

app.get('/queryUtils/:id/:param?', (req, res) => {
  console.log(req.params);

  queryUtils.handler(req.params)
    .then(results => {
      res.json(results);
      res.end();
    });
});

app.listen(PORT, () => console.log(`Listening on port http://localhost:${PORT}`));
