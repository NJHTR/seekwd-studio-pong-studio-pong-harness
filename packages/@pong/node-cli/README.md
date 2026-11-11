# @pong/node-cli

Official CLI for developing community nodes for pong.

## 🚀 Getting Started

**To create a new node**, run:

```bash
npm create @pong/node@latest # or pnpm/yarn/...
```

This will generate a project with `npm` scripts that use this CLI under the hood.

## 📦 Generated Project Commands

After creating your node with `npm create @pong/node`, you'll use these commands in your project:

### Development
```bash
npm run dev
# Runs: pong-node dev
```

### Building
```bash
npm run build
# Runs: pong-node build
```

### Linting
```bash
npm run lint
# Runs: pong-node lint

npm run lint:fix
# Runs: pong-node lint --fix
```

### Publishing
```bash
npm run release
# Runs: pong-node release
```

## 🛠️ CLI Reference

> **Note:** These commands are typically wrapped by `npm` scripts in generated projects.

```bash
pong-node [COMMAND] [OPTIONS]
```

### Commands

#### `pong-node new`

Create a new node project.

```bash
pong-node new [NAME] [OPTIONS]
```

**Flags:**
| Flag | Description |
|------|-------------|
| `-f, --force` | Overwrite destination folder if it already exists |
| `--skip-install` | Skip installing dependencies |
| `--template <template>` | Choose template: `declarative/custom`, `declarative/github-issues`, `programmatic/example` |

**Examples:**
```bash
pong-node new
pong-node new pong-nodes-my-app --skip-install
pong-node new pong-nodes-my-app --force
pong-node new pong-nodes-my-app --template declarative/custom
```

> **Note:** This command is used internally by `npm create @pong/node` to provide the interactive scaffolding experience.

#### `pong-node dev`

Run pong with your node in development mode with hot reload.

```bash
pong-node dev [--external-pong] [--custom-user-folder <value>]
```

**Flags:**
| Flag | Description |
|------|-------------|
| `--external-pong` | Run pong externally instead of in a subprocess |
| `--custom-user-folder <path>` | Folder to use to store user-specific pong data (default: `~/.pong-node-cli`) |

This command:
- Starts pong on `http://localhost:5678` (unless using `--external-pong`)
- Links your node to pong's custom nodes directory (`~/.pong-node-cli/.pong/custom`)
- Rebuilds on file changes for live preview
- Watches for changes in your `nodes/` and `credentials/` directories

**Examples:**
```bash
# Standard development with built-in pong
pong-node dev

# Use external pong instance
pong-node dev --external-pong

# Custom pong extensions directory
pong-node dev --custom-user-folder /home/user
```

#### `pong-node build`

Compile your node and prepare it for distribution.

```bash
pong-node build
```

**Flags:** None

Generates:
- Compiled TypeScript code
- Bundled node package
- Optimized assets and icons
- Ready-to-publish package in `dist/`

#### `pong-node lint`

Lint the node in the current directory.

```bash
pong-node lint [--fix]
```

**Flags:**
| Flag | Description |
|------|-------------|
| `--fix` | Automatically fix problems |

**Examples:**
```bash
# Check for linting issues
pong-node lint

# Automatically fix fixable issues
pong-node lint --fix
```

#### `pong-node cloud-support`

Manage pong Cloud eligibility.

```bash
pong-node cloud-support [enable|disable]
```

**Arguments:**
| Argument | Description |
|----------|-------------|
| _(none)_ | Show current cloud support status |
| `enable` | Enable strict mode + default ESLint config |
| `disable` | Allow custom ESLint config (disables cloud eligibility) |

Strict mode enforces the default ESLint configuration and community node rules required for pong Cloud verification. When disabled, you can customize your ESLint config but your node won't be eligible for pong Cloud verification.

#### `pong-node release`

Publish your community node package to npm.

```bash
pong-node release
```

**Flags:** None

This command handles the complete release process using [release-it](https://github.com/release-it/release-it):
- Builds the node
- Runs linting checks
- Updates changelog
- Creates git tags
- Creates GitHub releases
- Publishes to npm

## 🔄 Development Workflow

The recommended workflow using the scaffolding tool:

1. **Create your node**:
   ```bash
   npm create @pong/node pong-nodes-my-app
   cd pong-nodes-my-app
   ```

2. **Start development**:
   ```bash
   npm run dev
   ```
   - Starts pong on `http://localhost:5678`
   - Links your node automatically
   - Rebuilds on file changes

3. **Test your node** at `http://localhost:5678`

4. **Lint your code**:
   ```bash
   npm run lint
   ```

5. **Build for production**:
   ```bash
   npm run build
   ```

6. **Publish**:
   ```bash
   npm run release
   ```

## 📁 Project Structure

The CLI expects your project to follow this structure:

```
pong-nodes-my-app/
├── nodes/
│   └── MyApp/
│       ├── MyApp.node.ts
│       └── MyApp.node.json
├── credentials/
│   └── MyAppApi.credentials.ts
├── package.json
└── tsconfig.json
```

## ⚙️ Configuration

The CLI reads configuration from your `package.json`:

```json
{
  "name": "pong-nodes-my-app",
  "pong": {
    "pongNodesApiVersion": 1,
    "nodes": [
      "dist/nodes/MyApp/MyApp.node.js"
    ],
    "credentials": [
      "dist/credentials/MyAppApi.credentials.js"
    ]
  }
}
```

## 🐛 Troubleshooting

### Development server issues
```bash
# Clear pong custom nodes cache
rm -rf ~/.pong-node-cli/.pong/custom

# Restart development server
npm run dev
```

### Build failures
```bash
# Run linting first
npm run lint

# Clean build
npm run build
```

## 📚 Resources

- **[Creating Nodes Guide](https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness)** - Complete documentation
- **[Node Development Reference](https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness)** - API specifications
- **[Community Forum](https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness)** - Get help and showcase your nodes
- **[@pong/create-node](https://www.npmjs.com/package/@pong/create-node)** - Recommended scaffolding tool

## 🤝 Contributing

Found an issue? Contribute to the [pong repository](https://github.com/pong-io/pong) on GitHub.

---

**Happy node development! 🎉**
