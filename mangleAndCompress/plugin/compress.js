const { declare } = require("@babel/helper-plugin-utils");

function canExistAfterCompletion(path) {
	return (
		path.isFunctionDeclaration() ||
		path.isVariableDeclaration({
			kind: "var",
		})
	);
}

const compress = declare((api, options, dirname) => {
	api.assertVersion(7);

	return {
		pre(file) {
			file.set("uid", 0);
		},
		visitor: {
			BlockStatement(path) {
				const statementPaths = path.get("body");
				let purge = false;
				for (let i = 0; i < statementPaths.length; i++) {
					if (statementPaths[i].isCompletionStatement()) { // completionStateMent is alias of BreakStatement, ContinueStatement, ReturnStatement, ThrowStatement/
						purge = true;
						continue;
					}

					if (purge && !canExistAfterCompletion(statementPaths[i])) {
						statementPaths[i].remove(); // 对于结束语句后面不会执行的语句，删除处理。var function 除外
					}
				}
			},
            Scopable(path) {
                // 删掉没有引用的变量，如果变量的函数调用，则判断函数调用是否有副作用，有则不删除。否则删除。副作用指的是，除了输入输出外，还有其他的效果，
				Object.entries(path.scope.bindings).forEach(([key, binding]) => {
					if (!binding.referenced) { // 没有被引用到
						if (binding.path.get("init").isCallExpression()) { // 初始化的方式是函数调用的表达式
							const comments = binding.path.get("init").node.leadingComments;
							if (comments && comments[0]) {
								if (comments[0].value.includes("PURE")) { // 注释声明是纯函数，才可以删除。
									binding.path.remove();
									return;
								}
							}
						}
						if (!path.scope.isPure(binding.path.node.init)) { // babel 不能分析函数是否有副作用，于是能判断的声明，是纯的函数调用的声明，则删除，否则替换成函数调用，不要变量声明。
							binding.path.parentPath.replaceWith(
								api.types.expressionStatement(binding.path.node.init)
							);
						} else {
							binding.path.remove();
						}
					}
				});
			},
		},
	};
});

module.exports = compress;
