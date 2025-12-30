const vscode = require('vscode');
const { prettyFormat } = require('./format');

function activate(context) {
  const provider = {
    provideDocumentFormattingEdits(document) {
      const original = document.getText();
      const formatted = prettyFormat(original);
      if (formatted === original) return [];
      const fullRange = new vscode.Range(
        document.positionAt(0),
        document.positionAt(original.length)
      );
      return [vscode.TextEdit.replace(fullRange, formatted)];
    },
  };

  const selectors = [
    { language: 'terragrunt', scheme: '*' },
    { language: 'hcl', scheme: '*' },
  ];
  const registrations = selectors.map((selector) =>
    vscode.languages.registerDocumentFormattingEditProvider(selector, provider)
  );

  context.subscriptions.push(...registrations);
}

function deactivate() {}

module.exports = { activate, deactivate };

