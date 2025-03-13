module.exports = {
  root: true,
  env: { 
    browser: true, 
    es2020: true
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs', 'tests', '**/*.worker.js'],
  parserOptions: { 
    ecmaVersion: 'latest', 
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  settings: { 
    react: { version: '18.2' },
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx']
      }
    }
  },
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': 'warn',
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    'no-unused-vars': ['warn', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      ignoreRestSiblings: true
    }],
    'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
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
    'no-param-reassign': ['warn', { props: false }],
    'no-underscore-dangle': 'off',
    'no-multi-assign': 'off',
    'no-return-assign': 'off',
    'no-plusplus': 'off',
    'no-bitwise': 'off',
    'no-continue': 'off',
    'no-cond-assign': 'off',
    'no-sequences': 'off'
  }
} 