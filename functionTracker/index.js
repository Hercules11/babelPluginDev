const { transformFromAstSync } = require("@babel/core")
const parser = require("@babel/parser")
const autoTrackPlugin = require("./plugin/auto-track-plugin")
const fs = require("fs")
const path = require("path")

// 读取源代码字符串
const sourceCode = fs.readFileSync(path.join(__dirname, "./sourceCode.js"), {
    encoding: 'utf-8'
})

// 解析代码成ast
// Indicate the mode the code should be parsed in. Can be one of "script", "module", or "unambiguous". Defaults to "script". "unambiguous" will make

// @babel/parser attempt to guess, based on the presence of ES6 import or export statements. Files with ES6 imports and exports are considered "module" and are otherwise "script".
const ast = parser.parse(sourceCode, {
    sourceType: 'unambiguous'
})
const { code } = transformFromAstSync(ast, sourceCode, {
    plugins: [[autoTrackPlugin, { trackerPath: "tracker"}]] // 传入插件参数时，要么用字符串，找到内置的插件，要么用插件模块名，使其找到对于得到插件，用数组则第一个参数是插件名字，第二个是插件参数
})

console.log(code);