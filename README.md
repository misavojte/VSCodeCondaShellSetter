# Windows Conda PowerShell Setup

A VS Code extension that automatically configures Conda in Windows PowerShell terminals.

## Features

- Automatically initializes Conda in Windows PowerShell terminals
- Validates Miniconda installation paths
- Provides easy setup and reset commands
- Windows PowerShell specific implementation

## Requirements

- Windows operating system
- VS Code v1.70.0 or newer
- Miniconda installed on your Windows system

## Usage

1. Open the Command Palette (`Ctrl + Shift + P`)
2. Run `Apply Conda Terminal Settings`
3. Enter your Miniconda installation path when prompted
4. A new PowerShell terminal will open with Conda initialized

## Important Notes

- This extension only works with Windows PowerShell
- Does not support other terminals or operating systems
- Requires a valid Miniconda installation on Windows

## Commands

- `Apply Conda Terminal Settings`: Configure Conda in PowerShell
- `Reset Conda Terminal Settings`: Remove Conda configuration from PowerShell

## Release Notes

### 0.0.1
- Initial release with Windows PowerShell Conda configuration
