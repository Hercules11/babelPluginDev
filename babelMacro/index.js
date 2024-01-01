const { transformFileSync } = require("@babel/core");
const path = require("path");

const sourceFilePath = path.resolve(__dirname, "./sourceCode.js");

const { code } = transformFileSync(sourceFilePath, {
	plugins: [require("babel-plugin-macros")],
});

console.log(code);
