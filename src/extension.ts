import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('condaTerminalSetup.applySettings', async () => {
    // Prompt user for Miniconda installation path
    const condaPath = await vscode.window.showInputBox({
      prompt: 'Enter your Miniconda installation path',
      placeHolder: 'e.g., C://Users//YOUR_USERNAME//miniconda3',
      validateInput: (input) => {
        return input.trim() === '' ? 'Path cannot be empty.' : undefined;
      }
    });

    if (!condaPath) {
      vscode.window.showWarningMessage('Conda terminal setup canceled.');
      return;
    }

    const normalizedPath = condaPath.replace(/\\/g, '//');

    try {
      const config = vscode.workspace.getConfiguration('terminal.integrated');

      // Update terminal profiles with Conda paths for PowerShell
      await config.update(
        'profiles.windows',
        {
          PowerShell: {
            source: 'PowerShell',
            icon: 'terminal-powershell',
            env: {
              Path: `${normalizedPath};${normalizedPath}//Scripts;${normalizedPath}//Library//bin;${'${env:Path}'}`
            }
          }
        },
        vscode.ConfigurationTarget.Global
      );

      await config.update('defaultProfile.windows', 'PowerShell', vscode.ConfigurationTarget.Global);
      vscode.window.showInformationMessage('Conda terminal setup applied successfully!');
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to apply Conda terminal settings: ${error}`);
    }
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}