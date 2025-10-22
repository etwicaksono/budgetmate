/* eslint-env node */

module.exports = {
   parser: '@typescript-eslint/parser',
   plugins: ['@typescript-eslint', 'react', 'react-hooks'],
   extends: [
      'eslint:recommended',
      'plugin:react/recommended',
      'plugin:@typescript-eslint/recommended',
   ],
   settings: { react: { version: 'detect' } },
   rules: {
      'react/prop-types': 'off',
      'no-useless-catch': 'off',
   },
};
