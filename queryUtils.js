'use strict';

let aws = require('aws-sdk'),
  q = require('q');

aws.config.update({region: 'us-west-2'});

let docClient = new aws.DynamoDB.DocumentClient();
let queryEnum = [
  {
    id: 0,
    description: "Incidents from last week",
    paramRequired: false
  },
  {
    id: 1,
    description: "Incidents for specific device",
    paramRequired: true,
    paramInputText: "Enter device ID:"
  },
  {
    id: 2,
    description: "All unable_to_remove devices",
    paramRequired: false
  },
  {
    id: 3,
    description: "Incidents related to specific malware",
    paramRequired: true,
    paramInputText: "Enter malware name:"
  },
  {
    id: 4,
    description: "Incidents related to specific company",
    paramRequired: true,
    paramInputText: "Enter company name:"
  }
];

/**
 * Returns an array of queries needed to be executed in order to
 * retrieve all results between the start and end dates. the partition value
 * @param startDate
 * @param endDate
 */
function createQueriesForDates(startDate, endDate) {
  function queryDurationDefinition(start, end) {
    return {
      TableName: `IOT-${start.getFullYear()}-${start.getMonth() + 1}`,
      FilterExpression: '#time between :start and :end',
      ExpressionAttributeNames: {
        "#time": "timestamp"
      },
      ExpressionAttributeValues: {
        ":start": start.getTime(),
        ":end": end.getTime()
      }
    }
  }

  let queries = [],
    delta = endDate - startDate,
    startOfMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1, 0, 0);

  if (endDate - startOfMonth >= delta) {
    queries.push(queryDurationDefinition(startDate, endDate));

  } else {
    // since there is a table for each month, two queries need to be executed.
    queries.push(queryDurationDefinition(startOfMonth, endDate));
    queries.push(queryDurationDefinition(startDate, new Date(startOfMonth.getTime() - 1)));
  }

  return queries;
}

function scan(params) {
  let defer = q.defer();

  docClient.scan(params, function (err, data) {
    if (err) {
      defer.reject(err);
    } else {
      defer.resolve(data);
    }
  });

  return defer.promise;
}

/**
 * Returns a promise for data of the past 7 days.
 * Note that past 7 days might cross to previous month, in that case - 2 dynamo tables will be queried
 * and their results will be union.
 *
 * @returns {Q.Promise}
 */
function scanLastWeek() {
  let week = 604800000, now = Date.now();
  let queryParamsArray = createQueriesForDates(new Date(now - week), new Date(now)),
    promises = [];

  queryParamsArray.forEach(params => {
    promises.push(scan(params));
  });

  //noinspection JSUnresolvedFunction
  return q.allSettled(promises)
    .then(arr =>
      arr.filter(defer => defer.state === "fulfilled") // filter fulfilled
        .map(defer => defer.value.Items) // look at the results
        .reduce((prevUnion, currentArray) => prevUnion.concat(currentArray), [])); // union results
}

/**
 * Returns a promise for data on the specified query.
 *
 * @param query
 * @returns {Q.Promise}
 */
function queryHandler(query) {
  switch (query.id) {
    case "0":
      return scanLastWeek();
  }
}

module.exports = {
  handler: queryHandler,
  "enum": queryEnum
};