# IDK IDE

IDK IDE is a local-first AI development environment for the web and Windows.
It combines a Monaco code editor, project explorer, terminal workspace and an
AI assistant that connects to OpenAI-compatible local or cloud providers.

> Early preview: the interface and provider chat are functional. Filesystem,
> terminal execution and Git agent tools are still being hardened and should
> not be treated as production automation yet.

## Features

- Modern editor workspace with light and dark themes
- Streaming AI chat alongside project context
- Ollama, LM Studio and OpenAI-compatible endpoints
- Optional database and command-approval preferences
- Responsive web interface
- Tauri desktop shell and Windows installer workflow
- No persisted API keys in the browser prototype

## Run locally

Requirements: Node.js 22 or newer and npm.

```bash
git clone https://github.com/r-winn/IDK-IDE.git
cd IDK-IDE
npm install
npm run dev
```

Open `http://localhost:1420` and configure your provider in Settings.

## Provider examples

| Provider | Base URL | Notes |
| --- | --- | --- |
| Ollama | `http://localhost:11434/v1` | Start Ollama and pull a model first |
| LM Studio | `http://localhost:1234/v1` | Enable its local API server |
| Cloud | Provider-specific URL | Do not expose keys in public web builds |

## Build

```bash
npm run build
```

Windows users can download the standard `Setup.exe` from GitHub Releases. To
build the desktop app yourself, install Rust and the Tauri prerequisites, then
run `npm run desktop:build`.

## Security

AI output is untrusted input. Review generated code and commands before use.
Read [SECURITY.md](SECURITY.md) before connecting sensitive repositories or
cloud credentials.

## Contributing and license

See [CONTRIBUTING.md](CONTRIBUTING.md). Released under the [MIT License](LICENSE).
