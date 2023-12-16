const { declare } = require("@babel/helper-plugin-utils");

const noFuncAssignLint = declare((api, options, dirname) => {
	api.assertVersion(7);

	return {
		pre(file) {
			file.set("errors", []);
		},
		visitor: {
			AssignmentExpression(path, state) {
				const errors = state.file.get("errors");
				const assignTarget = path.get("left").toString();
				const binding = path.scope.getBinding(assignTarget);
				if (binding) {
					if (
						binding.path.isFunctionDeclaration() ||
						binding.path.isFunctionExpression() // for every binding, which also declaration, if it's function, throw error.
					) {
						// debugger;
						const tmp = Error.stackTraceLimit;
						Error.stackTraceLimit = 0; // enable system don't record construct error
						errors.push(
							path.buildCodeFrameError("can not reassign to function", Error)
						);
						Error.stackTraceLimit = tmp;
					}
				}
			},
		},
		post(file) {
			console.log(file.get("errors"));
		},
	};
});

module.exports = noFuncAssignLint;
