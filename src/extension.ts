import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';

export async function activate(context: vscode.ExtensionContext) {
  // Function to validate that the provided path is a valid Conda installation.
  const isValidCondaPath = (condaDir: string): boolean => {
    const requiredFiles = [
      path.join(condaDir, 'Scripts', 'conda.exe'),
      path.join(condaDir, 'python.exe')
    ];
    return requiredFiles.every(filePath => fs.existsSync(filePath));
  };

  const initializeConda = async (condaPath: string): Promise<boolean> => {
    try {
      const condaExe = path.join(condaPath, 'Scripts', 'conda.exe');
      await new Promise((resolve, reject) => {
        child_process.exec(`"${condaExe}" init powershell`, (error, stdout, stderr) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(stdout);
        });
      });
      return true;
    } catch (error) {
      console.error('Failed to initialize conda:', error);
      return false;
    }
  };

  // Command to set up the Conda path.
  const setupCommand = vscode.commands.registerCommand('condaTerminalSetup.applySettings', async () => {
    const defaultPath = path.join(process.env.USERPROFILE || '', 'miniconda3');
    
    const inputPath = await vscode.window.showInputBox({
      prompt: 'Enter your Miniconda installation path',
      value: defaultPath,
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

    const success = await initializeConda(inputPath);
    if (success) {
      await context.workspaceState.update('condaPath', inputPath);
      vscode.window.showInformationMessage(
        'Conda initialization successful! Opening a new terminal...'
      );
      vscode.window.createTerminal('Conda PowerShell').show();
    } else {
      vscode.window.showErrorMessage('Failed to initialize Conda. Please check the logs for more information.');
    }
  });

  // Command to reset the Conda configuration.
  const resetCommand = vscode.commands.registerCommand('condaTerminalSetup.resetSettings', async () => {
    const condaPath = context.workspaceState.get<string>('condaPath');
    if (condaPath && isValidCondaPath(condaPath)) {
      try {
        const condaExe = path.join(condaPath, 'Scripts', 'conda.exe');
        await new Promise((resolve, reject) => {
          child_process.exec(`"${condaExe}" init --reverse powershell`, (error, stdout, stderr) => {
            if (error) {
              reject(error);
              return;
            }
            resolve(stdout);
          });
        });
        await context.workspaceState.update('condaPath', undefined);
        vscode.window.showInformationMessage(
          'Conda has been removed from your PowerShell profile. Opening a new terminal...'
        );
        vscode.window.createTerminal('PowerShell').show();
      } catch (error) {
        console.error('Failed to de-initialize conda:', error);
        vscode.window.showErrorMessage('Failed to remove Conda from PowerShell profile. Please check the logs for more information.');
      }
    } else {
      await context.workspaceState.update('condaPath', undefined);
      vscode.window.showInformationMessage('Conda configuration reset. Opening a new terminal...');
      vscode.window.createTerminal('PowerShell').show();
    }
  });

  context.subscriptions.push(setupCommand, resetCommand);
}

export function deactivate() {}
