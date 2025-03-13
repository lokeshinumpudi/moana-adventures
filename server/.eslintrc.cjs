module.exports = {
  root: true,
  env: {
    node: true,
    es2020: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:node/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs', 'tests', 'coverage'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'node/no-unsupported-features/es-syntax': ['error', {
      version: '>=18.0.0',
      ignores: ['modules'],
    }],
    'node/no-missing-import': 'off',
    'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    'no-unused-vars': ['warn', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      ignoreRestSiblings: true
    }],
    'node/no-unpublished-import': 'off',
    'node/no-unpublished-require': 'off',
    'no-var': 'error',
    'prefer-const': 'warn',
    'no-multiple-empty-lines': ['warn', { max: 1 }],
    'no-trailing-spaces': 'warn',
    'semi': ['warn', 'always'],
    'quotes': ['warn', 'single'],
    'indent': ['warn', 2],
    'comma-dangle': ['warn', 'always-multiline'],
    'object-curly-spacing': ['warn', 'always'],
    'array-bracket-spacing': ['warn', 'never'],
    'max-len': ['warn', { 
      code: 100,
      ignoreComments: true,
      ignoreStrings: true,
      ignoreTemplateLiterals: true
    }],
    'node/no-unsupported-features/node-builtins': 'off',
    'node/no-callback-literal': 'off',
    'node/no-sync': 'warn'
  },
} 