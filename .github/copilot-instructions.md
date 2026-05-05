# Copilot instructions

## Python interpreter

At the start of each session, resolve the Python interpreter exactly once and reuse it for every Python command.

- macOS/Linux: select `python3` and store that selection as `PYTHON`.
- Windows: select `python` and store that selection as `PYTHON`.
- Do not repeatedly try both interpreter names.
- After selecting the interpreter, refer to it as `PYTHON` in reasoning and commands.
- Use the selected interpreter for scripts, modules, package installation, and tests.

Examples:

```bash
PYTHON=python3
$PYTHON -m pip install -r requirements-dev.txt
$PYTHON -m pytest
```

```powershell
$env:PYTHON = "python"
& $env:PYTHON -m pip install -r requirements-dev.txt
& $env:PYTHON -m pytest
```
