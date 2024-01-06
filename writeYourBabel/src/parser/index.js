const acorn = require("acorn");

const syntaxPlugins = {
    'literal': require('./plugins/literal'),
    'guangKeyword': require('./plugins/guangKeyword')
}

const defaultOptions = {
    plugins: []
}

function parse(code, options) {
    const resolvedOptions  = Object.assign({}, defaultOptions, options);
    const newParser = resolvedOptions.plugins.reduce((Parser, pluginName) => {
			let plugin = syntaxPlugins[pluginName];
			return plugin ? Parser.extend(plugin) : Parser; // extend
			// for(let plugin of resolveOptions.plugins) {
			// if(syntaxPlugins[plugin]) {
        // newParser = acorn.Parser extend(syntaxPlugins[plugin]) } else {
        // continue;
        // }
        // }u
		}, acorn.Parser);
    return newParser.parse(code, {
			locations: true, // reserve ast's location in source code
		});
}

module.exports = {
    parse
}

// a plugin essentially is a function called where meet proper type ast node.

