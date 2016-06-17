/**
 * This is the code executed in the AWS Lambda service.
 */

'use strict';
var aws = require('aws-sdk');
var sns = new aws.SNS();

exports.handler = (event, context, callback) => {
  event.Records.forEach((record) => {
    if (record.eventName === "MODIFY") {
      console.log(record.dynamodb.OldImage);
      console.log(record.dynamodb.NewImage);
      var params = {
        Message: 'Item modified',
        MessageAttributes: {
          dynamodb: {
            DataType: "String",
            StringValue: JSON.stringify(record.dynamodb)
          }
        },
        Subject: "Dynamodb Item Modified",
        TopicArn: "arn:aws:sns:us-west-2:314570958983:dynamodb"
      };

      sns.publish(params, (err) => {
        if (err) {
          callback(err);
        } else {
          callback(null, `Successfully processed ${event.Records.length} records.`);
        }
      })
    }
  })
};