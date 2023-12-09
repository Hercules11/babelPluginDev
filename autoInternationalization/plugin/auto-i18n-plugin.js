const { declare } = require("@babel/helper-plugin-utils");  // 这是一个 Babel 提供的辅助函数，用于声明和创建一个新的 Babel 插件
const fse = require("fs-extra");
const path = require("path");
const generate = require("@babel/generator").default;

let intlIndex = 0;
function nextIntlKey() {
	++intlIndex;
	return `intl${intlIndex}`;
}

const autoTrackPlugin = declare((api, options, dirname) => {
	// api 是 Babel 提供的一个接口，用于访问和操作插件的功能
	api.assertVersion(7);

	if (!options.outputDir) {
		throw new Error("outputDir in empty");
	}

	// replace origin string with module.t and uid.
	function getReplaceExpression(path, value, intlUid) {
		const expressionParams = path.isTemplateLiteral()
			? path.node.expressions.map((item) => generate(item).code) // template para generate children code.
			: null;
		let replaceExpression = api.template.ast(
			`${intlUid}.t('${value}'${
				expressionParams ? "," + expressionParams.join(",") : ""
			})`
		).expression;
		// 这里应该改成对特定的额jsx 属性进行国际化包装，而不是看是否是字符串
		// if (path.findParent((p) => p.isJSXAttribute()) && ["title", "alt"].includes(path.node.name)) {
		// 	replaceExpression = api.types.JSXExpressionContainer(replaceExpression);
		// }
		if (
			path.findParent((p) => p.isJSXAttribute()) &&
			!path.findParent((p) => p.isJSXExpressionContainer())
		) {
			// parent node is jsx and is not jsxcontainer, because jsxcontainer is handled in internal.
			replaceExpression = api.types.JSXExpressionContainer(replaceExpression);
		}
		return replaceExpression;
	}

	function save(file, key, value) {
		// save info to file in state
		const allText = file.get("allText");
		allText.push({
			key,
			value,
		});
		file.set("allText", allText);
	}

	// pre(file)分别对应插件在处理文件之前、visitor在遍历抽象语法树（AST）过程中和post(file)处理文件之后执行的操作
	return {
		// file represents state in file.
		pre(file) {
			file.set("allText", []);
		},
		visitor: {
			Program: {
				enter(path, state) {
					let imported;
					// 先遍历一遍导入节点，定义是否导入标识符
					path.traverse({
						ImportDeclaration(p) {
							const source = p.node.source.value;
							if (source === "intl") {
								imported = true;
							}
						},
					});
					// 未曾导入，则生成导入语句的ast
					if (!imported) {
						const uid = path.scope.generateUid("intl");
						const importAst = api.template.ast(`import ${uid} from 'intl'`);
						path.node.body.unshift(importAst);
						state.intlUid = uid; // 存储导入的模块名字，后面替换字符串和模板字面量的时候，要用
					}

					// 再遍历一次
					path.traverse({
						"StringLiteral|TemplateLiteral"(path) {
							if (path.node.leadingComments) {
								// 对于某个节点的开头注释数组，如果包含i18那么就清除掉这一项，
								path.node.leadingComments = path.node.leadingComments.filter(
									(comment, index) => {
										if (comment.value.includes("i18n-disable")) {
											path.node.skipTransform = true;
											return false;
										}
										return true;
									}
								);
							}
							// why?
							if (path.findParent((p) => p.isImportDeclaration())) {
								// skip parent node is importDeclaration, which node is string.
								path.node.skipTransform = true;
							}
						},
					});
				},
			},
			StringLiteral(path, state) {
				if (path.node.skipTransform) {
					return;
				}
				// find a string, then generate a key and save it to file with its value
				let key = nextIntlKey();
				save(state.file, key, path.node.value);

				const replaceExpression = getReplaceExpression(
					path,
					key,
					state.intlUid
				);
				// use replaced expression and skip the rest node traverse.
				path.replaceWith(replaceExpression);
				path.skip();
			},
			TemplateLiteral(path, state) {
				if (path.node.skipTransform) {
					return;
				}
				const value = path
					.get("quasis")
					.map((item) => item.node.value.raw)
					.join("{placeholder}");
				if (value) {
					let key = nextIntlKey();
					save(state.file, key, value);

					const replaceExpression = getReplaceExpression(
						path,
						key,
						state.intlUid
					);
					path.replaceWith(replaceExpression);
					path.skip();
				}
				// path.get('quasis').forEach(templateElementPath => {
				//     const value = templateElementPath.node.value.raw;
				//     if(value) {
				//         let key = nextIntlKey();
				//         save(state.file, key, value);

				//         const replaceExpression = getReplaceExpression(templateElementPath, key, state.intlUid);
				//         templateElementPath.replaceWith(replaceExpression);
				//     }
				// });
				// path.skip();
			},
		},
		post(file) {
			const allText = file.get("allText");
			const intlData = allText.reduce((obj, item) => {
				obj[item.key] = item.value;
				return obj;
			}, {});

			const content = `const resource = ${JSON.stringify(
				intlData,
				null,
				4
			)};\nexport default resource;`;
			fse.ensureDirSync(options.outputDir);
			fse.writeFileSync(path.join(options.outputDir, "zh_CN.js"), content);
			fse.writeFileSync(path.join(options.outputDir, "en_US.js"), content);
		},
	};
});
module.exports = autoTrackPlugin;
