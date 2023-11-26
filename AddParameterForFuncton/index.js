const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const generate = require("@babel/generator").default;
const types = require("@babel/types")

// test first babel plugin
const changeTwoName = require("../firstBabelPlugin/index"); // 改变全等号两边的字符变量

const sourceCode = `
    test1 === test2; // test change two name plugin

    console.log(1);

    function func() {
        console.info(2);
    }

    export default class Clazz {
        say() {
            console.debug(3);
        }
        render() {
            return <div>{console.error(4)}</div>
        }
    }
`;


const ast = parser.parse(sourceCode, {
    sourceType: 'unambiguous',
    plugins: ['jsx'],
})

traverse(ast, {
	CallExpression(path, state) {
		if (
			types.isMemberExpression(path.node.callee) &&
			path.node.callee.object.name === "console" &&
			["log", "info", "error", "debug"].includes(path.node.callee.property.name)
		) {
			const { line, column } = path.node.loc.start;
			path.node.arguments.unshift(
				types.stringLiteral(`filename: (${line}, ${column})`)
			);
		}
	},
	// BinaryExpression(path) {
	// 	if (path.node.operator !== "===") {
	// 		return;
	// 	}
	// 	path.node.left = types.identifier("sebmck");
	// 	path.node.right = types.identifier("dork");
	// },
});

// traverse(ast, changeTwoName({ types: types }).visitor); // 有没有直接实例化插件的地方？

const { code, map } = generate(ast)
console.log(code)
