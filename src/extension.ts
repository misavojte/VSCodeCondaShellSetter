import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';

let outputChannel: vscode.OutputChannel;

export async function activate(context: vscode.ExtensionContext) {
	try {
		// Initialize output channel
		outputChannel = vscode.window.createOutputChannel('Conda Terminal Setup');
		outputChannel.show();
		outputChannel.appendLine('Activating Conda Terminal Setup Extension...');
		
		// Function to validate that the provided path is a valid Conda installation.
		const isValidCondaPath = (condaDir: string): boolean => {
			try {
				const requiredFiles = [
					path.join(condaDir, 'Scripts', 'conda.exe'),
					path.join(condaDir, 'python.exe')
				];
				return requiredFiles.every(filePath => fs.existsSync(filePath));
			} catch (error) {
				console.error('Error validating conda path:', error);
				return false;
			}
		};

		const checkExecutionPolicy = async (): Promise<string> => {
			return new Promise((resolve, reject) => {
				child_process.exec('powershell -Command "Get-ExecutionPolicy"', (error, stdout, stderr) => {
					if (error) {
						reject(error);
						return;
					}
					resolve(stdout.trim());
				});
			});
		};

		const initializeConda = async (condaPath: string): Promise<boolean> => {
			try {
				const condaExe = path.join(condaPath, 'Scripts', 'conda.exe');
				outputChannel.appendLine(`Initializing conda with executable: ${condaExe}`);
				
				// Check execution policy first
				const policy = await checkExecutionPolicy();
				outputChannel.appendLine(`Current PowerShell execution policy: ${policy}`);
				
				if (policy.toLowerCase() === 'restricted') {
					vscode.window.showWarningMessage(
						'⚠️ PowerShell execution policy is Restricted. Please run PowerShell as administrator and execute: Set-ExecutionPolicy RemoteSigned'
					);
				}

				await new Promise((resolve, reject) => {
					const process = child_process.exec(
						`powershell -ExecutionPolicy Bypass -Command "& '${condaExe}' init powershell"`,
						(error, stdout, stderr) => {
							if (error) {
								outputChannel.appendLine(`Error: ${error.message}`);
								reject(error);
								return;
							}
							outputChannel.appendLine(`Output: ${stdout}`);
							if (stderr) {
								outputChannel.appendLine(`Stderr: ${stderr}`);
							}
							resolve(stdout);
						}
					);

					// Capture real-time output
					process.stdout?.on('data', (data) => {
						outputChannel.appendLine(`stdout: ${data}`);
					});
					process.stderr?.on('data', (data) => {
						outputChannel.appendLine(`stderr: ${data}`);
					});
				});
				return true;
			} catch (error) {
				outputChannel.appendLine(`Failed to initialize conda: ${error}`);
				console.error('Failed to initialize conda:', error);
				return false;
			}
		};

		const checkCondaSetup = async () => {
			try {
				const defaultPath = path.join(process.env.USERPROFILE || '', 'miniconda3');
				const savedPath = context.workspaceState.get<string>('condaPath');
				const paths = [defaultPath, savedPath].filter(Boolean);
				const validPath = paths.find(p => isValidCondaPath(p as string));

				if (!validPath) {
					const action = await vscode.window.showInformationMessage(
						'🔍 Conda installation not found. Would you like to set it up now?',
						'Setup Now',
						'Later'
					);
					if (action === 'Setup Now') {
						await vscode.commands.executeCommand('condaTerminalSetup.applySettings');
					}
					return;
				}

				const profilePath = path.join(process.env.USERPROFILE || '', 'Documents', 'WindowsPowerShell', 'profile.ps1');
				const profileExists = fs.existsSync(profilePath);
				
				if (profileExists) {
					const content = fs.readFileSync(profilePath, 'utf8');
					if (!content.includes('conda initialize')) {
						const action = await vscode.window.showInformationMessage(
							'🐍 Conda is installed but not initialized in PowerShell. Would you like to initialize it now?',
							'Initialize Now',
							'Later'
						);
						if (action === 'Initialize Now') {
							vscode.window.showInformationMessage('⏳ Please wait while Conda is being initialized in PowerShell...');
							const success = await initializeConda(validPath);
							if (success) {
								vscode.window.showInformationMessage('✅ Conda initialization complete! Opening new terminal...');
								vscode.window.createTerminal('Conda PowerShell').show();
							}
						}
					} else {
						vscode.window.showInformationMessage('✅ Opening Conda PowerShell terminal...');
						vscode.window.createTerminal('Conda PowerShell').show();
					}
				} else {
					const action = await vscode.window.showInformationMessage(
						'⚙️ PowerShell profile not found. Would you like to initialize Conda now?',
						'Initialize Now',
						'Later'
					);
					if (action === 'Initialize Now') {
						vscode.window.showInformationMessage('⏳ Please wait while Conda is being initialized in PowerShell...');
						const success = await initializeConda(validPath);
						if (success) {
							vscode.window.showInformationMessage('✅ Conda initialization complete! Opening new terminal...');
							vscode.window.createTerminal('Conda PowerShell').show();
						}
					}
				}
			} catch (error) {
				outputChannel.appendLine(`Error checking Conda setup: ${error}`);
				console.error('Error checking Conda setup:', error);
			}
		};

		await checkCondaSetup();

		// Command to set up the Conda path.
		const setupCommand = vscode.commands.registerCommand('condaTerminalSetup.applySettings', async () => {
			try {
				vscode.window.showInformationMessage('🔧 Applying Conda Settings...');
				
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
					return vscode.window.showWarningMessage('❌ Conda terminal setup canceled.');
				}

				const success = await initializeConda(inputPath);
				if (success) {
					await context.workspaceState.update('condaPath', inputPath);
					vscode.window.showInformationMessage(
						'🐍 Conda initialization successful! Opening a new terminal...'
					);
					vscode.window.createTerminal('Conda PowerShell').show();
				} else {
					vscode.window.showErrorMessage('⚠️ Failed to initialize Conda. Please check the logs for more information.');
				}
			} catch (error) {
				console.error('Error in applySettings command:', error);
				vscode.window.showErrorMessage('⚠️ Failed to apply Conda settings. Check the developer console for details.');
			}
		});

		// Command to reset the Conda configuration.
		const resetCommand = vscode.commands.registerCommand('condaTerminalSetup.resetSettings', async () => {
			try {
				outputChannel.appendLine('Executing reset command...');
				vscode.window.showInformationMessage('🔄 Resetting Conda Settings...');
				
				const condaPath = context.workspaceState.get<string>('condaPath');
				if (condaPath && isValidCondaPath(condaPath)) {
					try {
						const condaExe = path.join(condaPath, 'Scripts', 'conda.exe');
						outputChannel.appendLine(`Running conda init --reverse with executable: ${condaExe}`);
						
						await new Promise((resolve, reject) => {
							const process = child_process.exec(`"${condaExe}" init --reverse powershell`, (error, stdout, stderr) => {
								if (error) {
									outputChannel.appendLine(`Error: ${error.message}`);
									reject(error);
									return;
								}
								outputChannel.appendLine(`Output: ${stdout}`);
								if (stderr) {
									outputChannel.appendLine(`Stderr: ${stderr}`);
								}
								resolve(stdout);
							});

							// Capture real-time output
							process.stdout?.on('data', (data) => {
								outputChannel.appendLine(`stdout: ${data}`);
							});
							process.stderr?.on('data', (data) => {
								outputChannel.appendLine(`stderr: ${data}`);
							});
						});
						await context.workspaceState.update('condaPath', undefined);
						vscode.window.showInformationMessage(
							'🔄 Conda has been removed from your PowerShell profile. Opening a new terminal...'
						);
						vscode.window.createTerminal('PowerShell').show();
					} catch (error) {
						console.error('Failed to de-initialize conda:', error);
						vscode.window.showErrorMessage('⚠️ Failed to remove Conda from PowerShell profile. Please check the logs for more information.');
					}
				} else {
					await context.workspaceState.update('condaPath', undefined);
					vscode.window.showInformationMessage('🔄 Conda configuration reset. Opening a new terminal...');
					vscode.window.createTerminal('PowerShell').show();
				}
			} catch (error) {
				console.error('Error in resetSettings command:', error);
				vscode.window.showErrorMessage('⚠️ Failed to reset Conda settings. Check the developer console for details.');
			}
		});

		context.subscriptions.push(setupCommand, resetCommand);
		
		// Log successful activation
		console.log('Conda Terminal Setup Extension activated successfully');
		
	} catch (error) {
		console.error('Failed to activate Conda Terminal Setup Extension:', error);
		throw error; // Re-throw to ensure VS Code knows activation failed
	}
}

export function deactivate() {}
