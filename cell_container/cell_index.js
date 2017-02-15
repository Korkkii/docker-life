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

function update(req, res, next) {
  var currentGeneration = req.body.grid;
  console.log()
  var nextGenValue = calculateNextGenerationValue(currentGeneration);
  console.log(currentGeneration, nextGenValue)
  res.send({value: nextGenValue});
  if (nextGenValue == state.DEAD) {
    server.close()
  }
  next();
}

function ping(req, res, next) {
  res.send({});
  next();
}

server.use(restify.queryParser());
server.use(restify.bodyParser());
server.post("/update", update);
server.get("/ping", ping);

server.listen(8000);
