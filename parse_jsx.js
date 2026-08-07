const fs = require("fs");
const ts = require("typescript");
const file = "app/(app)/chat/[id].tsx";
const source = fs.readFileSync(file, "utf8");
const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const report = [];
function walk(node, parent) {
  if (node.kind === ts.SyntaxKind.JsxText) {
    const text = node.getText();
    const trimmed = text.replace(/\s+/g, "");
    if (trimmed.length > 0) {
      let tag = "";
      let current = parent;
      while (current) {
        if (current.kind === ts.SyntaxKind.JsxOpeningElement || current.kind === ts.SyntaxKind.JsxSelfClosingElement) {
          tag = current.tagName.getText();
          break;
        }
        current = current.parent;
      }
      if (tag !== "Text") {
        const { line } = ts.getLineAndCharacterOfPosition(sourceFile, node.pos);
        report.push(`${line + 1}: ${JSON.stringify(text.trim())} (parent=${tag || '<unknown>'})`);
      }
    }
  }
  ts.forEachChild(node, (child) => walk(child, node));
}
walk(sourceFile, sourceFile);
console.log(report.join("\n"));
