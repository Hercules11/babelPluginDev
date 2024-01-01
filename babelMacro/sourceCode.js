const files = require("./macro/file.macro.js");

console.log("src files:");
console.log(files("../babelMacro")); // files() 调用的结果替换原代码
console.log("macro files:");
console.log(files("./macro"));
