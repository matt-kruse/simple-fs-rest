var fs = require('fs');
var jsonpatch = require('jsonpatch');
var simpleFsRest = require('simple-fs-rest');
var express = require('express');

var app = express();
var PORT = process.env.port || 8080;

// Link the REST Service to a uri path
app.use('/api',simpleFsRest());
app.use('/api2',simpleFsRest('.data2/'));

app.listen(PORT);
console.log("Listening on port "+PORT);
