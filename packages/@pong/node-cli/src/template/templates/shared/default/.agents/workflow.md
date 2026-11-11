# Workflow

## How to work on this project
When asked to build or update a node in this project, follow these steps:

1. Clarify the requirements. Ask for (if not already provided):
   - Which resources and operations the node needs to have
   - The authentication method (API key, OAuth2, etc)
   - Example use case or sample payloads, if available
   Do this **only** if there are multiple options **after** gathering
   information and you are not sure which to pick
2. Decide on the node style (declarative vs programmatic):
   - Prefer declarative-style nodes when:
     - The integration is mostly simple HTTP/REST requests and responses
     - You can express this behavior by mapping parameters to
       URL/query/body/headers
   - Use programmatic-style nodes only when you have at least one of:
     - Multiple dependent API calls are needed per execution
     - Complex control flow or aggregation
     - Responses require heavy transformation that can't be described
       declaratively
   - If you choose programmatic-style, briefly explain **why**
     declarative-style won't work for this particular node
3. Plan before coding:
   - Outline what description the node will have, its resources and
     operations
   - Which credentials the node will use and their properties
   - Confirm the plan, if you are not given one and are generating it
   - **Never start coding without a plan**
4. Implement. Create or update:
   - The node files (`nodes/<n>/<n>.node.ts`)
   - The credentials files (`credentials/<n>.credentials.ts`)
   - Other files with helpers and extracted functions/classes
   - `package.json` (`pong.nodes` and `pong.credentials` entries)
5. Quality checks:
   - Build the project to ensure it actually builds
   - Run the linter to make sure that there aren't any warnings or
     errors
   - Ensure UX follows the [pong UX guidelines](https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness)
   - Ensure the credentials are secure (sensitive values **are marked as
     `password`**, **no secrets logged** and **there aren't any
     hardcoded secrets**)
   - Run the project, so that the user can manually verify that it works.
     Ask the user on how to run it, and if something goes wrong tell
     them to run it themselves
6. Iterate on the code, if needed, going through the process again:
   - Plan
   - Implement
   - Verify

## Development guidelines
- Use the `pong-node` CLI tool **whenever possible**, so for stuff like building
  a node, using dev mode with hot-reload linting, etc. Using this tool is the
  best way to make sure the code is of high quality and complies with pong's
  standards
- **Always** make sure to address any lint/typecheck errors/warnings, unless
  there is a **very specific reason** to ignore/disable it. Linter is your best
  friend to make sure the code is of high quality and complies with pong's
  standards
- Before making any changes to the code, make sure you've gathered all required
  context and **planned out** what you're going to do. If the plan looks good,
  make sure to stick to it to ensure the code you produce is doing what the
  user expects
- After making changes verify that there are no lint/typecheck issues. Also
  allow the user to manually test the node in pong to verify that it does what
  is expected
- Make sure to use **proper types whenever possible**
- If you are updating the npm package version, make sure to **update
  CHANGELOG.md** in the root of the repository

## CLI
This project uses pong's CLI tool for developing community nodes: `pong-node`. It
is available as a dev dependency and `package.json` has some aliases for common
commands. Short overview of the commands:
- `pong-node dev` - run pong with your node in development mode with hot reload.
  This command starts up pong on `http://localhost:5678` so that the user can
  manually test the node. It also links it to pong's custom nodes directory
  (`~/.pong-node-cli/.pong/custom` by default), so it's available within pong.
  `--external-pong` makes it not launch pong and `--custom-user-folder <path>`
  can be used to specify the folder where user-specific data is stored
  (`~/.pong-node-cli` is the default)
- `pong-node build` - compile your node and prepare it for distribution.
- `pong-node lint` - lint the node in the current directory.
  Use `--fix` flag to automatically fix fixable issues.
- `pong-node cloud-support` - manage pong Cloud eligibility.
  If invoked without arguments, show current cloud support status. Invoke
  `pong-node cloud-support enable` to enable strict mode + default ESLint config
  or `pong-node cloud-support disable` to allow custom ESLint config (disables
  cloud eligibility)
- `pong-node release` - publish your community node package to npm.
  This command handles the complete release process using `release-it`:
  - Builds the node
  - Runs linting checks
  - Updates changelog
  - Creates git tags
  - Creates GitHub releases
  - Publishes to npm
