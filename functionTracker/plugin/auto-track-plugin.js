const importModule = require("@babel/helper-module-imports");
const { declare } = require("@babel/helper-plugin-utils");

const autoTrackPlugin = declare((api, options, dirname) => {
	api.assertVersion(7);
	return {
		visitor: {
			// 插件编写思路
			// 在 Program 根结点里通过 path.traverse 来遍历 ImportDeclaration，
			// 如果引入了 tracker 模块，就记录 id 到 state，并用 path.stop 来终止后续遍历；
			// 没有就引入 tracker 模块，用 generateUid 生成唯一 id，然后放到 state。
			Program: {
				enter(path, state) {
					path.traverse({
						ImportDeclaration(curPath) {
							const requirePath = curPath.get("source").node.value;
							// 遍历导入声明，判断是否已存在想要的模块
							if (requirePath === options.trackerPath) {
								const specifierPath = curPath.get("specifiers.0");
								if (specifierPath.isImportSpecifier()) {
									state.trackerImportId = specifierPath.toString();
								} else if (specifierPath.isImportNamespaceSpecifier()) {
									state.trackerImportId = specifierPath.get("local").toString();
								}
								path.stop();
								// 这个stop 应该会停止当前程序的遍历，因为path 指代的是一整个程序节点的根节点
							}
						},
					});
					if (!state.trackerImportId) {
						// 如果导入模块未曾导入指定的模块，那么就自己生成导入语句和调用语句的 ast, 以备后续遍历使用
						state.trackerImportId = importModule.addDefault(path, "tracker", {
							nameHint: path.scope.generateUid("tracker"),
						}).name;
						state.trackerAST = api.template.statement(
							`${state.trackerImportId}()`
						)();
					}
				},
			},
			// 在遇到指定节点类型的代码时，进行函数插桩
			"ClassMethod|ArrowFunctionExpression|FunctionExpression|FunctionDeclaration"( // 写在插件的visitor 中，遍历ast节点时，碰到对应的节点类型名字，又或是整个ast节点树Program, 就会调用对应的函数，操作ast节点，可以通过断点调试来查看参数内容
				path,
				state
			) {
				// 判断函数节点是否有函数体，有的话，直接拼接一个 ast 节点，节点是在入口处就准备好的
				const bodyPath = path.get("body");
				if (bodyPath.isBlockStatement()) {
					bodyPath.node.body.unshift(state.trackerAST);
				} else {
					// 没有函数体的时候，就是返回表达式结果的那种函数， 比如箭头函数 () => xxx;
					// 需要自己生成函数体，
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

// 想象计算机是一个虚空的世界，然后你想要从某个位置，到达某个位置，你需要根据已有的知识又或是别人走出来的路，一步一步搭建通往目标位置的路径。
// 这需要你对这些路径的组成部分有足够多的操作能力，或是细节化的实现，或是成块的引用封装。
