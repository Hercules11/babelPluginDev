const generate = require("@babel/generator").default;

const targetCalleeName = ["log", "info", "error", "debug"].map(
	(item) => `console.${item}`
);

// export a object with visitor property, babel will auto use it  to transform ast node.
module.exports = function ({ types, template }) {
	return {
		visitor: {
			CallExpression(path, state) {
				if (path.node.isNew) {
					return;
                }
                // debugger; command line use  `node --inspect-brk file.js`, then open chrome://inspect to inspect source file. run from first file.

				const calleeName = generate(path.node.callee).code;

				if (targetCalleeName.includes(calleeName)) {
					const { line, column } = path.node.loc.start;

					const newNode = template.expression(
						`console.log("${
							state.filename || "unkown filename"
						}: (${line}, ${column})")`
					)();
					newNode.isNew = true;

					if (path.findParent((path) => path.isJSXElement())) {
						path.replaceWith(types.arrayExpression([newNode, path.node]));
						path.skip();
					} else {
						path.insertBefore(newNode);
					}
				}
			},
		},
	};
};
