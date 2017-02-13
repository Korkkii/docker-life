"use strict";

var Enum = require("enum");
var state = new Enum({'ALIVE' : 1, 'DEAD' : 0});
var restify = require("restify");
var environment = process.env;
var x = parseInt(environment.X);
var y = parseInt(environment.Y);
var neighbours = require("./lib/neighbours");
var server = restify.createServer();
var Promise = require("bluebird");
var request = Promise.promisify(require("request"));
Promise.promisifyAll(request);

function calculateNextGenerationValue(currentGenerationGrid) {
  var neighbourCount = neighbours.calculate(x, y, currentGenerationGrid);
  return calculateCellValue(neighbourCount);
}

function calculateCellValue(neighboursAlive) {
  if (neighboursAlive == 2 || neighboursAlive == 3) {
    return state.ALIVE;
  } else {
    // Dies by overpopulation / underpopulation
    return state.DEAD;
  }
}

function respond(req, res, next) {
  var currentGeneration = req.body.grid;
  var nextGenValue = calculateNextGenerationValue(currentGeneration);
  res.send({value: nextGenValue});
  if (nextGenValue == state.DEAD) {
    server.close()
  }
  next();
}

server.use(restify.queryParser());
server.use(restify.bodyParser());
server.post("/update", respond);

server.listen(8000);
