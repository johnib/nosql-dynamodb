"use strict";

let PORT = process.env.PORT || 3000;

//noinspection JSUnusedLocalSymbols
let express = require('express'),
  morgan = require('morgan'),
  redis = require('ioredis'),
  aws = require('aws-sdk');

aws.config.update({region: 'eu-central-1'});

let app = express();

app.use(morgan('dev'));
app.use(express.static(__dirname + '/www'));

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));