import { ESLintUtils } from '@typescript-eslint/utils';

const REPO_URL = 'https://github.com/pong-io/pong';
const DOCS_PATH = 'blob/master/packages/@pong/eslint-plugin-community-nodes/docs/rules';

export const createRule = ESLintUtils.RuleCreator((name) => `${REPO_URL}/${DOCS_PATH}/${name}.md`);
