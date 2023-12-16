const { declare } = require("@babel/helper-plugin-utils");

const forDirectionLint = declare((api, options, dirname) => {
	api.assertVersion(7);

	return {
		pre(file) {
			file.set("errors", []);
		},
		visitor: {
			ForStatement(path, state) {
				const errors = state.file.get("errors");
				const testOperator = path.node.test.operator;
				const udpateOperator = path.node.update.operator;

                // 规则实现有点死板，实际情况应该要复杂很多
                // this implements rule that there is an upper boarder and updater is ++.
				let sholdUpdateOperator;
				if (["<", "<="].includes(testOperator)) {
					sholdUpdateOperator = "++";
				} else if ([">", ">="].includes(testOperator)) {
					sholdUpdateOperator = "--";
				}

                if (sholdUpdateOperator !== udpateOperator) {
                    // debugger;
					const tmp = Error.stackTraceLimit;
					Error.stackTraceLimit = 0;
                    errors.push(
                        // in case to print twice error, zero system error track.
						path.get("update").buildCodeFrameError("for direction error", Error)
                    );
                    // after record error info, recover system error stack
					Error.stackTraceLimit = tmp;
				}
			},
		},
		post(file) {
			console.log(file.get("errors"));
		},
	};
});

module.exports = forDirectionLint;
