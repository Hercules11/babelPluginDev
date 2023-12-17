const { declare } = require("@babel/helper-plugin-utils");

function resolveType(targetType, referenceTypesMap = {}) {
	const tsTypeAnnotationMap = {
		TSStringKeyword: "string",
		TSNumberKeyword: "number",
	};
	switch (targetType.type) {
		case "TSTypeReference":
			// if (targetType.typeAnnotation.type === "TSTypeReference") {
			// if (targetType.type === "TSTypeReference") {
				// return referenceTypesMap[targetType.typeAnnotation.typeName.name];
				return referenceTypesMap[targetType.typeName.name];
			// }
			// return tsTypeAnnotationMap[targetType.typeAnnotation.type];
		case "TSNumberKeyword":
			return "number";
		case "TSStringKeyword":
			return "string";
		case "NumberTypeAnnotation":
			return "number";
		case "StringTypeAnnotation":
			return "string";
		case "TSNumberKeyword":
			return "number";
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
			CallExpression(path, state) {
                const errors = state.file.get("errors");
                debugger
                // generics type parameter
				const realTypes = path.node.typeParameters.params.map((item) => {
					return resolveType(item);
                });
                // real type parameter
				const argumentsTypes = path.get("arguments").map((item) => {
					return resolveType(item.getTypeAnnotation());
				});
				const calleeName = path.get("callee").toString();
				const functionDeclarePath = path.scope.getBinding(calleeName).path;
                const realTypeMap = {};
				debugger;
				// pass real type to generic parameter
				functionDeclarePath.node.typeParameters.params.map((item, index) => {
					realTypeMap[item.name] = realTypes[index];
				});
				const declareParamsTypes = functionDeclarePath
					.get("params")
                    .map((item) => {
						debugger
						// convert declaration type to real type for compare
						return resolveType(item.getTypeAnnotation(), realTypeMap);
					});

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
