var app = angular.module('nosql', []);

app.service('dynamodb', function () {
  console.log("dynamodb service initialized");
});

app.controller('main', function ($scope) {
  console.log("main controller initialized");

  $scope.queryEnum = [
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

  $scope.submit = function (form) {
    console.log(form);
  }

});