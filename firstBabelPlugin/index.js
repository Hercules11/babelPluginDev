module.exports = function changeTwoName({ types: t }) {
    // 一个简单的babel 插件，
    return {
        visitor: {
            // Identifier(path, state) { },
            // ASTNodeTypeHere(path, state) { },
            BinaryExpression(path) {
                if (path.node.operator !== "===") {
                    return;
                }
                path.node.left = t.identifier("sebmck");
                path.node.right = t.identifier("dork");
            }
        }
    }
}