const { declare } = require("@babel/helper-plugin-utils");

const base54 = (function () {
	var DIGITS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$_";
	return function (num) {
		var ret = "";
		do {
			ret = DIGITS.charAt(num % 54) + ret;
			num = Math.floor(num / 54);
		} while (num > 0);
		return ret;
	};
})();

const mangle = declare((api, options, dirname) => {
	api.assertVersion(7);

	return {
		pre(file) {
			file.set("uid", 0);
		},
		visitor: {
			Scopable: { // Scopable is alias of FunctionDeclaration and BlockStatement, which means it can have scope. 有作用域的
				exit(path, state) {
					// if(!toplevel && !path.scope.parent) {
					//     return;
					// }
					// if(path.scope.hasEval) {
					//     return;
                    // }
                    debugger
                    // 就是说，实现一个需求，你要理清楚基础要素之间的逻辑关系，然后在看看底层代码提供了哪些支撑。加以利用
					let uid = state.file.get("uid");
					Object.entries(path.scope.bindings).forEach(([key, binding]) => {
						if (binding.mangled) return;
						binding.mangled = true;
						const newName = path.scope.generateUid(base54(uid++));
						binding.path.scope.rename(key, newName); // change every reference to newName use babel api
					});
					state.file.set("uid", uid);
				},
			},
		},
	};
});

module.exports = mangle;
