var path = require('path');
var fs = require('fs');
var Handlebars = require('handlebars');

var maxCellAmount = 3;
var templatePath = path.join(__dirname, "./docker-compose.yml.tmpl");
var composeFile = path.join(__dirname, "../docker-compose.yml");

fs.readFile(templatePath, (err, data) => {
  if (err) {
    console.log(err);
  }
  var templateSource = data.toString('utf8');
  var template = Handlebars.compile(templateSource);
  var data = {
    cells: []
  }
  for (var j = 0; j < maxCellAmount; j++) {
    for (var i = 0; i < maxCellAmount; i++) {
      data.cells.push({
        X: i,
        Y: j
      });
    }
  }
  fs.writeFile(composeFile, template(data), (err) => {
    if (err) console.log(err);
  });
})
