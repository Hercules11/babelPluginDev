const { declare } = require("@babel/helper-plugin-utils");

function typeEval(node, params) {
	let checkType;
	if (node.checkType.type === "TSTypeReference") {
		checkType = params[node.checkType.typeName.name];
	} else {
		checkType = resolveType(node.checkType);
	}
	const extendsType = resolveType(node.extendsType);
	if (checkType === extendsType || checkType instanceof extendsType) {
		return resolveType(node.trueType);
	} else {
		return resolveType(node.falseType);
	}
}

function resolveType(targetType, referenceTypesMap = {}, scope) {
	const tsTypeAnnotationMap = {
		TSStringKeyword: "string",
		TSNumberKeyword: "number",
	};
	switch (targetType.type) {
		// case "TSTypeAnnotation": // 在获取参数类型时，底层代码已经做了一层判断
		// 	if (targetType.typeAnnotation.type === "TSTypeReference") {
		// 		return referenceTypesMap[targetType.typeName.name];
		// 	}
		// 	return tsTypeAnnotationMap[targetType.type];
		case "NumberTypeAnnotation":
			return "number";
		case "StringTypeAnnotation":
			return "string";
		case "TSNumberKeyword":
			return "number";
		case "TSTypeReference":
			if (!targetType.typeParameters) { // 观察代码可得，通过判断类型引用有没有参数，进行不同的动作
				if (targetType.type === "TSTypeReference") {
					return referenceTypesMap[targetType.typeName.name];
				}
				return tsTypeAnnotationMap[targetType.type];
			}
			// get variable of scope for more info.
			// 去作用域里面获取类型别名的信息
			debugger;
			const typeAlias = scope.getData(targetType.typeName.name);
			const paramTypes = targetType.typeParameters.params.map((item) => {
				return resolveType(item);
			});
			// 遍历类型别名参数，与实际的类型别名的参数对应
			const params = typeAlias.paramNames.reduce((obj, name, index) => {
				obj[name] = paramTypes[index];
				return obj;
			}, {});
			return typeEval(typeAlias.body, params);
		case "TSLiteralType":
			return targetType.literal.value;
	}
}

function noStackTraceWrapper(cb) {
	const tmp = Error.stackTraceLimit;
	Error.stackTraceLimit = 0;
	cb && cb(Error);
	Error.stackTraceLimit = tmp;
}

const noFuncAssignLint = declare((api, options, dirname) => {
	api.assertVersion(7);

	return {
		pre(file) {
			file.set("errors", []);
		},
		visitor: {
			TSTypeAliasDeclaration(path) {
				// debugger;
				// record type alias and its params
				// 理解代码处理的功能界限，支持的功能不同，所需的代码量天差地别
				path.scope.setData(path.get("id").toString(), {
					paramNames: path.node.typeParameters.params.map((item) => {
						return item.name;
					}),
					body: path.getTypeAnnotation(),
				});
				// path.scope.setData(path.get("params"));
			},
			CallExpression(path, state) {
				debugger;
				const errors = state.file.get("errors");

				// collect real type of type parameter
				const realTypes = path.node.typeParameters.params.map((item) => {
					return resolveType(item, {}, path.scope);
				});
				// collect real types in function call.
				const argumentsTypes = path.get("arguments").map((item) => {
					return resolveType(item.getTypeAnnotation());
				});
				const calleeName = path.get("callee").toString();
				const functionDeclarePath = path.scope.getBinding(calleeName).path;
				const realTypeMap = {};
				functionDeclarePath.node.typeParameters.params.map((item, index) => {
					realTypeMap[item.name] = realTypes[index];
				});
				const declareParamsTypes = functionDeclarePath
					.get("params")
					.map((item) => {
						return resolveType(item.getTypeAnnotation(), realTypeMap);
					});

				// compare type, if error then record and print
				argumentsTypes.forEach((item, index) => {
					if (item !== declareParamsTypes[index]) {
						noStackTraceWrapper((Error) => {
							errors.push(
								path
									.get("arguments." + index)
									.buildCodeFrameError(
										`${item} can not assign to ${declareParamsTypes[index]}`,
										Error
									)
							);
						});
					}
				});
			},
		},
		post(file) {
			console.log(file.get("errors"));
		},
	};
});

module.exports = noFuncAssignLint;

// ts 高级特性实现思路
// 1. 解析类型别名，后面用来求解类型参数
// 2. 解析函数调用的类型参数，遍历类型参数，结合1求解得到每一个类型参数对应的真实类型
// 3. 解析函数调用的参数类型得到真实调用参数类型数组
// 4. 解析函数声明，包括函数的泛型和参数类型列表，得到每一个参数对应的泛型
// 5. 结合2，4得到每一个参数应为的类型
// 6. 判断调用函数的参数类型和应为的类型

// 写框架等底层代码，难点在于分门别类的处理各种情况。与工程代码要求的健壮性不同。工程代码要求，快速实现，小步迭代，运行稳健。
