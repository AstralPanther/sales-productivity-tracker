module.exports = {
    env: {
        browser: true,
        node: true,
        es2021: true,
        jest: true
    },
    extends: [
        'eslint:recommended'
    ],
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
    },
    globals: {
        electronAPI: 'readonly',
        DataManager: 'readonly',
        ProgressBar: 'readonly', 
        InputDialog: 'readonly'
    },
    rules: {
        // Error Prevention
        'no-unused-vars': ['error', { 
            args: 'after-used',
            ignoreRestSiblings: true,
            argsIgnorePattern: '^_'
        }],
        'no-console': 'off', // Allow console for debugging
        'no-debugger': 'error',
        'no-alert': 'error',
        
        // Code Quality
        'prefer-const': 'error',
        'no-var': 'error',
        'no-duplicate-imports': 'error',
        'no-unused-expressions': 'error',
        'no-unreachable': 'error',
        
        // Style Consistency
        'indent': ['error', 4, { SwitchCase: 1 }],
        'quotes': ['error', 'single', { avoidEscape: true }],
        'semi': ['error', 'always'],
        'comma-dangle': ['error', 'never'],
        'comma-spacing': ['error', { before: false, after: true }],
        'key-spacing': ['error', { beforeColon: false, afterColon: true }],
        'object-curly-spacing': ['error', 'always'],
        'array-bracket-spacing': ['error', 'never'],
        'space-before-function-paren': ['error', {
            anonymous: 'never',
            named: 'never',
            asyncArrow: 'always'
        }],
        'space-in-parens': ['error', 'never'],
        'space-before-blocks': ['error', 'always'],
        'keyword-spacing': ['error', { before: true, after: true }],
        
        // Function Best Practices
        'arrow-parens': ['error', 'as-needed'],
        'arrow-spacing': ['error', { before: true, after: true }],
        'no-arrow-condition': 'off', // Rule doesn't exist in modern ESLint
        
        // Object/Array Best Practices
        'dot-notation': 'error',
        'no-multi-spaces': 'error',
        'no-trailing-spaces': 'error',
        'eol-last': ['error', 'always'],
        'newline-before-return': 'error',
        
        // Error Handling
        'no-throw-literal': 'error',
        'prefer-promise-reject-errors': 'error',
        
        // Performance
        'no-loop-func': 'error',
        'no-new': 'error',
        'no-new-func': 'error',
        'no-new-object': 'error',
        'no-new-wrappers': 'error'
    },
    overrides: [
        {
            files: ['tests/**/*.js'],
            env: {
                jest: true
            },
            rules: {
                'no-unused-expressions': 'off' // Allow expressions in tests
            }
        },
        {
            files: ['src/main/**/*.js'],
            env: {
                node: true,
                browser: false
            },
            rules: {
                'no-console': 'off' // Allow console in main process
            }
        }
    ]
};