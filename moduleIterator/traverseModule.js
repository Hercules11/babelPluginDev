const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const fs = require("fs");
const path = require("path");
const DependencyNode = require("./DependencyNode");

const visitedModules = new Set(); // deduplicate

const IMPORT_TYPE = {
	deconstruct: "deconstruct",
	default: "default",
	namespace: "namespace",
};
const EXPORT_TYPE = {
	all: "all",
	default: "default",
	named: "named",
};

function resolveBabelSyntaxPlugins(modulePath) {
    // call different plugins by different extension name
	const plugins = [];
	if ([".tsx", ".jsx"].some((ext) => modulePath.endsWith(ext))) {
		plugins.push("jsx");
	}
	if ([".ts", ".tsx"].some((ext) => modulePath.endsWith(ext))) {
		plugins.push("typescript");
	}
	return plugins;
}

function isDirectory(filePath) {
    // if filePath id fir then use index.js file default.
	try {
		return fs.statSync(filePath).isDirectory();
	} catch (e) {}
	return false;
}

function completeModulePath(modulePath) {
	const EXTS = [".tsx", ".ts", ".jsx", ".js"];
	if (modulePath.match(/\.[a-zA-Z]+$/)) {
		return modulePath;
	}

	function tryCompletePath(resolvePath) {
		for (let i = 0; i < EXTS.length; i++) {
			let tryPath = resolvePath(EXTS[i]);
			if (fs.existsSync(tryPath)) {
				return tryPath;
			}
		}
	}

	function reportModuleNotFoundError(modulePath) {
		throw "module not found: " + modulePath;
	}

	if (isDirectory(modulePath)) {
		const tryModulePath = tryCompletePath((ext) =>
			path.join(modulePath, "index" + ext)
		);
		if (!tryModulePath) {
			reportModuleNotFoundError(modulePath);
		} else {
			return tryModulePath;
		}
	} else if (!EXTS.some((ext) => modulePath.endsWith(ext))) {
		const tryModulePath = tryCompletePath((ext) => modulePath + ext);
		if (!tryModulePath) {
			reportModuleNotFoundError(modulePath);
		} else {
			return tryModulePath;
		}
	}
	return modulePath;
}

// get real full module path
function moduleResolver(curModulePath, requirePath) {
	requirePath = path.resolve(path.dirname(curModulePath), requirePath);

	// 过滤掉第三方模块
	if (requirePath.includes("node_modules")) {
		return "";
	}

	requirePath = completeModulePath(requirePath);

	if (visitedModules.has(requirePath)) {
		return "";
	} else {
		visitedModules.add(requirePath);
	}
	return requirePath;
}

function traverseJsModule(curModulePath, dependencyGraphNode, allModules) {
	const moduleFileContent = fs.readFileSync(curModulePath, {
		encoding: "utf-8",
	});
	dependencyGraphNode.path = curModulePath;

	const ast = parser.parse(moduleFileContent, {
		sourceType: "unambiguous",
		plugins: resolveBabelSyntaxPlugins(curModulePath),
	});

	traverse(ast, {
		ImportDeclaration(path) {
			const subModulePath = moduleResolver(
				curModulePath,
				path.get("source.value").node
			);
			if (!subModulePath) {
				return;
			}

			const specifierPaths = path.get("specifiers");
			dependencyGraphNode.imports[subModulePath] = specifierPaths.map(
				(specifierPath) => {
					if (specifierPath.isImportSpecifier()) {
						return {
							type: IMPORT_TYPE.deconstruct,
							imported: specifierPath.get("imported").node.name,
							local: specifierPath.get("local").node.name,
						};
					} else if (specifierPath.isImportDefaultSpecifier()) {
						return {
							type: IMPORT_TYPE.default,
							local: specifierPath.get("local").node.name,
						};
					} else {
						return {
							type: IMPORT_TYPE.namespace,
							local: specifierPath.get("local").node.name,
						};
					}
				}
			);

            // for every file, record its path, imports, exports and subModule info
			const subModule = new DependencyNode();
			traverseJsModule(subModulePath, subModule, allModules); // traverse imports module use its info
			dependencyGraphNode.subModules[subModule.path] = subModule;
		},
		ExportDeclaration(path) {
			if (path.isExportNamedDeclaration()) {
				const specifiers = path.get("specifiers");
				dependencyGraphNode.exports = specifiers.map((specifierPath) => ({
					type: EXPORT_TYPE.named,
					exported: specifierPath.get("exported").node.name,
					local: specifierPath.get("local").node.name,
				}));
			} else if (path.isExportDefaultDeclaration()) {
				let exportName;
				const declarationPath = path.get("declaration");
				if (declarationPath.isAssignmentExpression()) {
					exportName = declarationPath.get("left").toString();
				} else {
					exportName = declarationPath.toString();
				}
				dependencyGraphNode.exports.push({
					type: EXPORT_TYPE.default,
					exported: exportName,
				});
			} else {
				dependencyGraphNode.exports.push({
					type: EXPORT_TYPE.all,
					exported: path.get("exported").node.name,
					source: path.get("source").node.value,
				});
			}
		},
	});
	allModules[curModulePath] = dependencyGraphNode; // 记录所有模块的信息，包括子模块
}

module.exports = function (curModulePath) {
	const dependencyGraph = {
		root: new DependencyNode(),
		allModules: {},
	};
	traverseJsModule(
		curModulePath,
		dependencyGraph.root,
		dependencyGraph.allModules
	);
	return dependencyGraph;
};
