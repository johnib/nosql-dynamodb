'use strict';

let REDIS_IP = process.env.REDIS_IP || "localhost",
  REDIS_PORT = process.env.REDIS_PORT || 6379;

let aws = require('aws-sdk'),
  Redis = require('ioredis'),
  redis = new Redis(REDIS_PORT, REDIS_IP),
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
      arr.filter(defer => defer.state === "fulfilled")
        .map(defer => defer.value.Items) // zoom to the results
        .reduce((prevUnion, currentResultsArray) =>
          prevUnion.concat(currentResultsArray), [])); // union results

}

/**
 * Returns a promise for all data of the action specified in descending order.
 *
 * @param actionType
 * @returns {Promise}
 */
function queryByAction(actionType) {
  let now = new Date();
  let params = {
    TableName: `IOT-${now.getFullYear()}-${now.getMonth() + 1}`,
    IndexName: 'action-timestamp-index',
    KeyConditionExpression: `#action=:action`,
    ExpressionAttributeNames: {"#action": "action"},
    ExpressionAttributeValues: {":action": actionType},
    ScanIndexForward: false // descending
  };

  return query(params)
    .then(data => data.Items)
}

/**
 * Returns a promise for all data of the device_id.
 *
 * @param deviceId
 * @returns {Promise}
 */
function queryByDeviceId(deviceId) {
  let now = new Date();
  let params = {
    TableName: `IOT-${now.getFullYear()}-${now.getMonth() + 1}`,
    KeyConditionExpression: `#id=:id`,
    ExpressionAttributeNames: {"#id": "device_id"},
    ExpressionAttributeValues: {":id": deviceId}
  };

  return query(params)
    .then(data => data.Items);
}

/**
 * Returns a promise for all data of the malware.
 *
 * @param malware
 * @returns {Promise}
 */
function queryByMalware(malware) {
  let now = new Date();
  let params = {
    TableName: `IOT-${now.getFullYear()}-${now.getMonth() + 1}`,
    IndexName: 'malware-index',
    KeyConditionExpression: `#malware=:malware`,
    ExpressionAttributeNames: {"#malware": "malware"},
    ExpressionAttributeValues: {":malware": malware}
  };

  return query(params)
    .then(data => data.Items);
}

/**
 * Returns a promise for all data of the malware.
 *
 * @param company
 * @returns {Promise}
 */
function queryByCompany(company) {
  let now = new Date();
  let params = {
    TableName: `IOT-${now.getFullYear()}-${now.getMonth() + 1}`,
    IndexName: 'company-index',
    KeyConditionExpression: `#company=:company`,
    ExpressionAttributeNames: {"#company": "company"},
    ExpressionAttributeValues: {":company": company}
  };

  return query(params)
    .then(data => data.Items);
}

/**
 * Returns a promise for data on the specified query.
 *
 * @param query
 * @returns {Promise}
 */
function queryHandler(query) {

  /*
   * key syntax:
   * [query_id]-[query_param] with TTL of 1 minute.
   */
  let queryCacheKey = `${query.id}-${query.param}`;

  // retrieve results from cache or query dynamodb and update cache.
  return redis.get(queryCacheKey)
    .then(JSON.parse)
    .then(cacheHit => cacheHit ? cacheHit : querySelector(query))
    .then(results => {
      redis.set(queryCacheKey, JSON.stringify(results), 'ex', 60);
      return results;
    });
}

/**
 * Runs the right query given the query object that contains
 * the query-id and query-param (optional).
 *
 * Returns a promise for the query results.
 *
 * @param query the query
 * @returns {Promise} of the data
 */
function querySelector(query) {
  switch (query.id) {
    case "0":
      return scanLastWeek();
    case "1":
      return queryByDeviceId(query.param);
    case "2":
      return queryByAction("unable_to_remove");
    case "3":
      return queryByMalware(query.param);
    case "4":
      return queryByCompany(query.param);
    default:
      return q.reject(new Error("Unknown type of query"));
  }
}

module.exports = {
  handler: queryHandler,
  "enum": queryEnum
};

/**
 * Promise-based scan command for dynamodb
 *
 * @param params
 * @returns {Promise}
 */
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
 * Promise-based query command for dynamodb
 * @param params
 * @returns {Promise}
 */
function query(params) {
  let defer = q.defer();

  docClient.query(params, (err, data) => {
    if (err) {
      defer.reject(err);
    } else {
      defer.resolve(data);
    }
  });

  return defer.promise;
}