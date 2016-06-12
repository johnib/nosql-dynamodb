var app = angular.module('nosql', []);

app.service('dynamodb', function ($http) {
  console.log("dynamodb service initialized");

  this.getQueryEnum = function () {
    return $http.get('/queryList')
  };

  this.sendQuery = function (form) {
    var params = Object.keys(form).reduce(function (prev, key) {
      return prev + form[key] + '/';
    }, "/");

    return $http.get('/queryUtils' + params);
  }

});

app.controller('main', function ($scope, dynamodb) {
  console.log("main controller initialized");
  var self = $scope;

  dynamodb.getQueryEnum()
    .then(function (queryEnum) {
      self.queryEnum = queryEnum;
    });

  $scope.submit = function (form) {
    console.log(form);

    dynamodb.sendQuery(form)
      .then(function (res) {
        console.log(res);
      })
      .catch(function (err) {
        console.error(err);
      })
  }
});