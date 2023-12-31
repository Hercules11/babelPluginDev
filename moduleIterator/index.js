const traverseModule = require("./traverseModule");
const path = require("path");

const dependencyGraph = traverseModule(
	path.resolve(__dirname, "./test-project/index.js")
);
console.log(JSON.stringify(dependencyGraph, null, 4));

// this file is main file, which launch the entire project.