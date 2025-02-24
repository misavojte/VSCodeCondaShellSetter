import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export async function activate(context: vscode.ExtensionContext) {
  // Function to validate that the provided path is a valid Conda installation.
  const isValidCondaPath = (condaDir: string): boolean => {
    const requiredFiles = [
      path.join(condaDir, 'Scripts', 'conda.exe'),
      path.join(condaDir, 'python.exe')
    ];
    return requiredFiles.every(filePath => fs.existsSync(filePath));
  };

  // Terminal profile provider that dynamically retrieves the Conda path.
  const terminalEnvProvider: vscode.TerminalProfileProvider = {
    provideTerminalProfile(token: vscode.CancellationToken): vscode.ProviderResult<vscode.TerminalProfile> {
      const condaPath = context.workspaceState.get<string>('condaPath');
      if (!condaPath || !isValidCondaPath(condaPath)) {
        vscode.window.showWarningMessage('Invalid or unset Conda path. Please configure it using the setup command.');
        return new vscode.TerminalProfile({});
      }

      // Construct the environment variables, ensuring proper path joining.
      const envVars: { [key: string]: string } = {
        'PATH': [
          condaPath,
          path.join(condaPath, 'Scripts'),
          path.join(condaPath, 'Library', 'bin'),
          path.join(condaPath, 'Library', 'mingw-w64', 'bin'),
          path.join(condaPath, 'Library', 'usr', 'bin'),
          path.join(condaPath, 'Library', 'msys2', 'bin'),
          '${env:PATH}'
        ].join(';'),
        'CONDA_PREFIX': condaPath,
        'CONDA_DEFAULT_ENV': 'base',
        'CONDA_EXE': path.join(condaPath, 'Scripts', 'conda.exe'),
        'CONDA_PYTHON_EXE': path.join(condaPath, 'python.exe')
      };

      return new vscode.TerminalProfile({
        env: envVars,
        shellPath: 'powershell.exe',
        shellArgs: [], // Add any shell initialization arguments here if needed.,
        color: new vscode.ThemeColor('terminal.ansiBlue'),
      });
    }
  };

  // Register the terminal profile provider.
  context.subscriptions.push(
    vscode.window.registerTerminalProfileProvider('conda-env', terminalEnvProvider)
  );

  // Command to set up the Conda path.
  const setupCommand = vscode.commands.registerCommand('condaTerminalSetup.applySettings', async () => {
    const inputPath = await vscode.window.showInputBox({
      prompt: 'Enter your Miniconda installation path',
      placeHolder: 'C:\\Users\\YOUR_USERNAME\\miniconda3',
      validateInput: (value: string) => {
        if (!value.trim()) {
          return 'Path cannot be empty.';
        }
        if (!/^[a-zA-Z]:\\/.test(value)) {
          return 'Please enter a valid Windows path';
        }
        if (!isValidCondaPath(value)) {
          return 'Provided path does not contain a valid Conda installation.';
        }
        return null;
      }
    });

    if (!inputPath) {
      return vscode.window.showWarningMessage('Conda terminal setup canceled.');
    }

    await context.workspaceState.update('condaPath', inputPath);
    vscode.window.showInformationMessage('Conda configuration applied successfully! New terminals will include the Conda environment variables.');
  });

  // Command to reset the Conda configuration.
  const resetCommand = vscode.commands.registerCommand('condaTerminalSetup.resetSettings', async () => {
    await context.workspaceState.update('condaPath', undefined);
    vscode.window.showInformationMessage('Conda configuration reset successfully.');
  });

  context.subscriptions.push(setupCommand, resetCommand);
}

export function deactivate() {}
