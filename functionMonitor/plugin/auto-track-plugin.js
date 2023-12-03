const importModule = require("@babel/helper-module-imports");
const { declare } = require("@babel/helper-plugin-utils");

const autoTrackPlugin = declare((api, options, dirname) => {
	api.assertVersion(7);
	return {
		visitor: {
			Program: {
                enter(path, state) {
                    debugger;
					path.traverse({
						ImportDeclaration(curPath) {
							const requirePath = curPath.get("source").node.value;
							if (requirePath === options.trackerPath) {
								const specifierPath = curPath.get("specifiers.0");
								if (specifierPath.isImportSpecifier()) {
									state.trackerImportId = specifierPath.toString();
								} else if (specifierPath.isImportNamespaceSpecifier()) {
									state.trackerImportId = specifierPath.get("local").toString();
								}
								path.stop();
							}
						},
					});
					if (!state.trackerImportId) {
						state.trackerImportId = importModule.addDefault(path, "tracker", {
							nameHint: path.scope.generateUid("tracker"),
						}).name;
						state.trackerAST = api.template.statement(
							`${state.trackerImportId}()`
						)();
					}
				},
			},
			"ClassMethod|ArrowFunctionExpression|FunctionExpression|FunctionDeclaration"( // 写在插件的visitor 中，遍历ast节点时，碰到对应的节点类型名字，又或是整个ast节点树Program, 就会调用对应的函数，操作ast节点，可以通过断点调试来查看参数内容
				path,
				state
            ) {
                debugger;
				const bodyPath = path.get("body");
				if (bodyPath.isBlockStatement()) {
					bodyPath.node.body.unshift(state.trackerAST);
				} else {
					const ast = api.template.statement(
						`{${state.trackerImportId}();return PREV_BODY;}`
					)({ PREV_BODY: bodyPath.node });
					bodyPath.replaceWith(ast);
				}
			},
		},
	};
});

module.exports = autoTrackPlugin;
