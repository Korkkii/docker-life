"use strict";

var Enum = require("enum");
var state = new Enum({'ALIVE' : 1, 'DEAD' : 0});
var restify = require("restify");
var environment = process.env;
var server = restify.createServer();
var Promise = require("bluebird");
var request = Promise.promisify(require("request"));
Promise.promisifyAll(request);
var neighbourCells = getNeighbourCells(3);
var currentGeneration = 0;
var value = state.ALIVE;
var generation = [
  [0, 0, 0],
  [0, 1, 0],
  [0, 0, 0]
];

function getNeighbourCells(size) {
  var cells = [];
  for (var x = Math.max(0, environment.X - 1); x <= Math.min(environment.X + 1, size - 1); x++) {
    for (var y = Math.max(0, environment.Y - 1); y <= Math.min(environment.Y + 1, size - 1); y++) {
      if (x != environment.X || y != environment.Y) {
        var i = x - (environment.X - 1);
        var j = y - (environment.Y - 1);
        var cell = {
          "i": i,
          "j": j,
          "url": `http://cell_${x}_${y}:8000/value`
        };
        cells.push(cell);
      }
    }
  }
  return cells;
}

function calculateNextGenerationValue() {
  var N = 0;
  for (var i = 0; i < 2; i++) {
    for (var j = 0; j < 2; j++) {
      if (i != j) {
        N += generation[j][i];
      }
    }
  }

  return calculateCellValue(N);
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
  var previousGeneration = generation;
  var nextGeneration = generation;
  var nextGenNumber = currentGeneration + 1;
  var nextGenValue = calculateNextGenerationValue();

  if (nextGenValue == state.DEAD) {
    res.send("DEAD");
    server.close();
    next();
  } else {
    Promise.map(neighbourCells, (cell) => {
      return request.getAsync({url: cell.url, qs: {generation: nextGenNumber}}).then((result) => {
        nextGeneration[cell.j][cell.i] = 1;
      }, (err) => {
        nextGeneration[cell.j][cell.i] = 0;
      })
    }).then(() => {
      generation = nextGeneration;
      value = nextGenValue;
      currentGeneration = nextGenNumber;
      res.send({"generation": generation, "number": nextGenNumber, "value": value});
      next();
    })
  }
}

function askValue(req, res, next) {
  if (req.params.generation == value) {
    res.send({value: value});
  } else {
    res.send({value: value});
  }

  next();
}

server.use(restify.queryParser());
server.get("/", respond);
server.get("/value", askValue);

server.listen(8000);
