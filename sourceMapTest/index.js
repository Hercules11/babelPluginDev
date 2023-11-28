var sourceMap = require("source-map");

var map = new sourceMap.SourceMapGenerator({
    file: './source-code.js'
})

map.addMapping({
    generated: {
        line: 10,
        column: 35,
    },
    source: 'source-code.js',
    original: {
        line: 33,
        column:2,
    },
})

// firstly, the source-map is used to record source file position to generated file position.
// addMapping mean to auto generated a record for test.

console.log(map.toString());