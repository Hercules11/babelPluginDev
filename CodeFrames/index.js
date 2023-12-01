const { codeFrameColumns } = require("@babel/code-frame")

const code = `const a = 1;
cost b = 1;

console.log(a+b);`

debugger;

const res = codeFrameColumns(
	code,
	{
		start: { line: 2, column: 1 },
		end: { line: 3, column: 5 },
	},
	{
		highlightCode: true,
		message: "测试出错信息高亮",
	}
);

console.log(res);