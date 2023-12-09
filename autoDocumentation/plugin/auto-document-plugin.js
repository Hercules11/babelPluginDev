const { declare } = require("@babel/helper-plugin-utils");
const doctrine = require("doctrine");
const fse = require("fs-extra");
const path = require("path");
const renderer = require("./renderer"); // require 文件，默认去找 index 文件

function parseComment(commentStr) {
	if (!commentStr) {
		return;
	}
    return doctrine.parse(commentStr, {
        // unwrap - set to true to delete the leading /**, any * that begins a line,
        // and the trailing */ from the source text.Default: false.
			unwrap: true,
		});
}

function generate(docs, format = "json") {
	if (format === "markdown") {
		return {
			ext: ".md",
			content: renderer.markdown(docs),
		};
	} else if (format === "html") {
		return {
			ext: "html",
			content: renderer.html(docs),
		};
	} else {
		return {
			ext: "json",
			content: renderer.json(docs),
		};
	}
}

function resolveType(tsType) {
	const typeAnnotation = tsType.typeAnnotation;
	if (!typeAnnotation) {
		return;
	}
	switch (typeAnnotation.type) {
		case "TSStringKeyword":
			return "string";
		case "TSNumberKeyword":
			return "number";
		case "TSBooleanKeyword":
			return "boolean";
	}
}

const autoDocumentPlugin = declare((api, options, dirname) => {
	api.assertVersion(7);

	return {
        pre(file) {
            // file 对象就是state 对象内部的一个file 属性
			file.set("docs", []);
		},
		visitor: {
            FunctionDeclaration(path, state) {
                const docs = state.file.get("docs");
                // 思路是先设计好文档需要的信息，在一个一个从ast 语法树中凑齐信息
				docs.push({
					type: "function",
					name: path.get("id").toString(),
					params: path.get("params").map((paramPath) => {
						return {
							name: paramPath.toString(),
							type: resolveType(paramPath.getTypeAnnotation()),
						};
					}),
					return: resolveType(path.get("returnType").getTypeAnnotation()),
					doc:
						path.node.leadingComments &&
						parseComment(path.node.leadingComments[path.node.leadingComments.length-1].value), // 应该取最接近函数的注释
				});
				state.file.set("docs", docs);
			},
			ClassDeclaration(path, state) {
				const docs = state.file.get("docs");
				const classInfo = {
					type: "class",
					name: path.get("id").toString(),
					constructorInfo: {},
					methodsInfo: [],
					propertiesInfo: [],
                };
                // 开头的注释块
				if (path.node.leadingComments) {
					classInfo.doc = parseComment(
						path.node.leadingComments[path.node.leadingComments.length-1].value
					);
                }
                // 应该是基于当前节点的子节点的遍历
				path.traverse({
					ClassProperty(path) {
						classInfo.propertiesInfo.push({
							name: path.get("key").toString(),
							type: resolveType(path.getTypeAnnotation()),
							doc: [path.node.leadingComments, path.node.trailingComments]
								.filter(Boolean)
								.map((comment) => {
									return parseComment(comment.value);
								})
                                .filter(Boolean),
                            // 在 JavaScript 中，Boolean 是一个表示真（true）或假（false）的原始数据类型。它主要用于表示逻辑值。此外，Boolean 还可以作为一个函数，将传入的参数转换为布尔值。
                            // 当作为函数使用时，它会根据传入参数的类型和值来确定布尔值。
						});
					},
					ClassMethod(path) {
						if (path.node.kind === "constructor") {
							classInfo.constructorInfo = {
								params: path.get("params").map((paramPath) => {
									return {
										name: paramPath.toString(),
										type: resolveType(paramPath.getTypeAnnotation()),
										doc: parseComment(path.node.leadingComments[0].value),
									};
								}),
							};
						} else {
							classInfo.methodsInfo.push({
								name: path.get("key").toString(),
								doc: parseComment(path.node.leadingComments[0].value),
								params: path.get("params").map((paramPath) => {
									return {
										name: paramPath.toString(),
										type: resolveType(paramPath.getTypeAnnotation()),
									};
								}),
								return: resolveType(path.getTypeAnnotation()),
							});
						}
					},
				});
				docs.push(classInfo);
				state.file.set("docs", docs);
			},
		},
        post(file) {
            // get data, generate code, write to file
			const docs = file.get("docs");
			const res = generate(docs, options.format);
			fse.ensureDirSync(options.outputDir);
			fse.writeFileSync(
				path.join(options.outputDir, "docs" + res.ext),
				res.content
			);
		},
	};
});

module.exports = autoDocumentPlugin;
