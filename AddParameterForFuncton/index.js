const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const generate = require("@babel/generator").default;
const types = require("@babel/types");
const template = require("@babel/template").default;

// test first babel plugin
const changeTwoName = require("../firstBabelPlugin/index"); // 改变全等号两边的字符变量

// const sourceCode = `
//     test1 === test2; // test change two name plugin

//     console.log(1);

//     function func() {
//         console.info(2);
//     }

//     export default class Clazz {
//         say() {
//             console.debug(3);
//         }
//         render() {
//             return <div>{console.error(4)}</div>
//         }
//     }
// `;

const sourceCode = `console.log("filename: (2, 4)", 1);

function func() {
  console.info("filename: (5, 8)", 2);
}

export default class Clazz {
  say() {
    console.debug("filename: (10, 12)", 3);
  }

  render() {
    return <div>{console.error("filename: (13, 25)", 4)}</div>;
  }

}`;



const ast = parser.parse(sourceCode, {
	sourceType: "unambiguous",
	plugins: ["jsx"],
});

const targetCalleeName = ["log", "info", "error", "debug"].map(
	(item) => `console.${item}`
);


traverse(ast, {
	CallExpression(path, state) {
		if (path.node.isNew) {
			return;
		}
		const calleeName = generate(path.node.callee).code;
		if (targetCalleeName.includes(calleeName)) {
			const { line, column } = path.node.loc.start; // 新插入的节点还没有位置属性，不加isNew 属性限制会报错

			const newNode = template.expression(
				`console.log("filename: (${line}, ${column})")`
			)();
			newNode.isNew = true;

			if (path.findParent((path) => path.isJSXElement())) { // 对越jsx 内部的console.log 要例外处理、
				path.replaceWith(types.arrayExpression([newNode, path.node]));
				path.skip(); // 跳过当前节点的子路径
			} else {
				path.insertBefore(newNode);
			}
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

const { code, map } = generate(ast);
console.log(code);
