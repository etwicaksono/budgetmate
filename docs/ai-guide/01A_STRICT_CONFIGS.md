# 01A. Strict TypeScript & ESLint Configurations

## 🛡️ Strict Configuration Files for Bug Prevention

These configurations enforce strict type checking and code quality rules to catch bugs early in development.

---

## 📝 TypeScript Configuration (tsconfig.json)

Create/Update `tsconfig.json` with strict settings:

```json
{
  "compilerOptions": {
    // Type Checking - STRICT MODE
    "strict": true,                                 // Enable all strict type-checking options
    "noImplicitAny": true,                         // Error on expressions with 'any' type
    "strictNullChecks": true,                      // Enable strict null checks
    "strictFunctionTypes": true,                   // Enable strict checking of function types
    "strictBindCallApply": true,                   // Enable strict bind, call, and apply
    "strictPropertyInitialization": true,          // Ensure properties are initialized
    "noImplicitThis": true,                        // Error on 'this' with 'any' type
    "useUnknownInCatchVariables": true,           // Use 'unknown' in catch variables
    "alwaysStrict": true,                         // Ensure 'use strict' in all files
    
    // Additional Checks
    "noUnusedLocals": true,                       // Error on unused locals
    "noUnusedParameters": true,                   // Error on unused parameters
    "exactOptionalPropertyTypes": true,           // Strict optional property types
    "noImplicitReturns": true,                    // Error when not all paths return
    "noFallthroughCasesInSwitch": true,          // Error for fallthrough cases in switch
    "noUncheckedIndexedAccess": true,            // Add undefined to index signatures
    "noImplicitOverride": true,                  // Ensure 'override' modifier is used
    "noPropertyAccessFromIndexSignature": true,   // Require explicit index access
    "allowUnusedLabels": false,                   // Error on unused labels
    "allowUnreachableCode": false,                // Error on unreachable code
    
    // Module Resolution
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "allowJs": false,                             // Don't allow JavaScript files
    "checkJs": false,                             // Don't check JS files
    "jsx": "preserve",
    
    // Emit
    "declaration": true,                          // Generate .d.ts files
    "declarationMap": true,                       // Generate sourcemaps for declarations
    "sourceMap": true,                           // Generate sourcemaps
    "noEmit": true,                              // Don't emit outputs (Next.js handles this)
    
    // JavaScript Support
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    
    // Language and Environment
    "skipLibCheck": true,                        // Skip type checking of declaration files
    "forceConsistentCasingInFileNames": true,   // Ensure consistent casing
    
    // Path Mapping
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/services/*": ["./src/services/*"],
      "@/hooks/*": ["./src/hooks/*"],
      "@/context/*": ["./src/context/*"],
      "@/types/*": ["./src/types/*"],
      "@/utils/*": ["./src/utils/*"],
      "@/data/*": ["./src/data/*"],
      "@/styles/*": ["./src/styles/*"]
    },
    
    // Next.js
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ]
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    "src/**/*",
    "app/**/*",
    "prisma/**/*.ts"
  ],
  "exclude": [
    "node_modules",
    ".next",
    "out",
    "dist",
    "build",
    "coverage",
    "*.config.js",
    "*.config.ts"
  ]
}
```

---

## 🔍 ESLint Configuration (.eslintrc.json)

Create `.eslintrc.json` with strict rules:

```json
{
  "extends": [
    "next/core-web-vitals",
    "eslint:recommended",
    "plugin:@typescript-eslint/strict-type-checked",
    "plugin:@typescript-eslint/stylistic-type-checked",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:jsx-a11y/strict",
    "plugin:security/recommended",
    "prettier"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module",
    "project": ["./tsconfig.json"],
    "ecmaFeatures": {
      "jsx": true
    }
  },
  "plugins": [
    "@typescript-eslint",
    "react",
    "react-hooks",
    "jsx-a11y",
    "security",
    "import",
    "unused-imports",
    "no-secrets"
  ],
  "rules": {
    // TypeScript Strict Rules
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unsafe-assignment": "error",
    "@typescript-eslint/no-unsafe-member-access": "error",
    "@typescript-eslint/no-unsafe-call": "error",
    "@typescript-eslint/no-unsafe-return": "error",
    "@typescript-eslint/no-unsafe-argument": "error",
    "@typescript-eslint/explicit-function-return-type": [
      "error",
      {
        "allowExpressions": true,
        "allowTypedFunctionExpressions": true,
        "allowHigherOrderFunctions": true,
        "allowDirectConstAssertionInArrowFunctions": true
      }
    ],
    "@typescript-eslint/explicit-module-boundary-types": "error",
    "@typescript-eslint/no-non-null-assertion": "error",
    "@typescript-eslint/strict-boolean-expressions": [
      "error",
      {
        "allowNullableObject": false,
        "allowNullableBoolean": false,
        "allowNullableString": false,
        "allowNullableNumber": false
      }
    ],
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/no-misused-promises": "error",
    "@typescript-eslint/await-thenable": "error",
    "@typescript-eslint/require-await": "error",
    "@typescript-eslint/no-unnecessary-type-assertion": "error",
    "@typescript-eslint/no-unnecessary-condition": "error",
    "@typescript-eslint/no-unnecessary-boolean-literal-compare": "error",
    "@typescript-eslint/switch-exhaustiveness-check": "error",
    "@typescript-eslint/no-confusing-void-expression": "error",
    "@typescript-eslint/no-meaningless-void-operator": "error",
    "@typescript-eslint/prefer-nullish-coalescing": "error",
    "@typescript-eslint/prefer-optional-chain": "error",
    "@typescript-eslint/prefer-readonly": "error",
    "@typescript-eslint/prefer-readonly-parameter-types": "off", // Too strict for React
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
        "caughtErrorsIgnorePattern": "^_"
      }
    ],
    
    // React Strict Rules
    "react/prop-types": "off", // We use TypeScript
    "react/react-in-jsx-scope": "off", // Next.js handles this
    "react/jsx-no-target-blank": "error",
    "react/jsx-no-duplicate-props": "error",
    "react/jsx-no-undef": "error",
    "react/no-children-prop": "error",
    "react/no-danger": "error",
    "react/no-danger-with-children": "error",
    "react/no-deprecated": "error",
    "react/no-direct-mutation-state": "error",
    "react/no-find-dom-node": "error",
    "react/no-is-mounted": "error",
    "react/no-render-return-value": "error",
    "react/no-string-refs": "error",
    "react/no-unescaped-entities": "error",
    "react/no-unknown-property": "error",
    "react/no-unsafe": "error",
    "react/require-render-return": "error",
    "react/self-closing-comp": "error",
    "react/jsx-boolean-value": ["error", "never"],
    "react/jsx-fragments": ["error", "syntax"],
    "react/jsx-no-useless-fragment": "error",
    "react/jsx-curly-brace-presence": [
      "error",
      {
        "props": "never",
        "children": "never"
      }
    ],
    
    // React Hooks Rules
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "error",
    
    // Import Rules
    "import/no-unresolved": "error",
    "import/named": "error",
    "import/default": "error",
    "import/namespace": "error",
    "import/no-named-as-default": "error",
    "import/no-named-as-default-member": "error",
    "import/no-duplicates": "error",
    "import/order": [
      "error",
      {
        "groups": [
          "builtin",
          "external",
          "internal",
          ["parent", "sibling"],
          "index",
          "object",
          "type"
        ],
        "newlines-between": "always",
        "alphabetize": {
          "order": "asc",
          "caseInsensitive": true
        }
      }
    ],
    "unused-imports/no-unused-imports": "error",
    "unused-imports/no-unused-vars": [
      "error",
      {
        "vars": "all",
        "varsIgnorePattern": "^_",
        "args": "after-used",
        "argsIgnorePattern": "^_"
      }
    ],
    
    // Security Rules
    "security/detect-object-injection": "warn",
    "security/detect-non-literal-regexp": "warn",
    "security/detect-unsafe-regex": "error",
    "security/detect-eval-with-expression": "error",
    "no-secrets/no-secrets": [
      "error",
      {
        "tolerance": 4.5
      }
    ],
    
    // General JavaScript Rules
    "no-console": [
      "error",
      {
        "allow": ["warn", "error", "info"]
      }
    ],
    "no-debugger": "error",
    "no-alert": "error",
    "no-var": "error",
    "prefer-const": "error",
    "prefer-template": "error",
    "prefer-arrow-callback": "error",
    "no-param-reassign": "error",
    "no-nested-ternary": "error",
    "no-unneeded-ternary": "error",
    "no-eval": "error",
    "no-implied-eval": "error",
    "no-new-func": "error",
    "no-script-url": "error",
    "no-return-await": "error",
    "require-atomic-updates": "error",
    "no-async-promise-executor": "error",
    "no-await-in-loop": "warn",
    "no-promise-executor-return": "error",
    "prefer-promise-reject-errors": "error",
    "no-throw-literal": "error",
    "no-useless-catch": "error",
    "consistent-return": "error",
    "curly": ["error", "all"],
    "default-case": "error",
    "default-case-last": "error",
    "dot-notation": "error",
    "eqeqeq": ["error", "always"],
    "no-else-return": "error",
    "no-empty-function": "error",
    "no-empty-pattern": "error",
    "no-fallthrough": "error",
    "no-lone-blocks": "error",
    "no-loop-func": "error",
    "no-magic-numbers": [
      "warn",
      {
        "ignore": [0, 1, -1],
        "ignoreArrayIndexes": true,
        "enforceConst": true
      }
    ],
    "no-multi-spaces": "error",
    "no-redeclare": "error",
    "no-return-assign": "error",
    "no-self-assign": "error",
    "no-self-compare": "error",
    "no-sequences": "error",
    "no-unused-expressions": "error",
    "no-useless-call": "error",
    "no-useless-concat": "error",
    "no-useless-return": "error",
    "no-void": "error",
    "radix": "error",
    "yoda": "error",
    
    // Accessibility Rules
    "jsx-a11y/alt-text": "error",
    "jsx-a11y/anchor-has-content": "error",
    "jsx-a11y/anchor-is-valid": "error",
    "jsx-a11y/aria-props": "error",
    "jsx-a11y/aria-proptypes": "error",
    "jsx-a11y/aria-unsupported-elements": "error",
    "jsx-a11y/heading-has-content": "error",
    "jsx-a11y/html-has-lang": "error",
    "jsx-a11y/iframe-has-title": "error",
    "jsx-a11y/img-redundant-alt": "error",
    "jsx-a11y/no-access-key": "error",
    "jsx-a11y/no-distracting-elements": "error",
    "jsx-a11y/no-redundant-roles": "error",
    "jsx-a11y/role-has-required-aria-props": "error",
    "jsx-a11y/role-supports-aria-props": "error",
    "jsx-a11y/scope": "error"
  },
  "settings": {
    "react": {
      "version": "detect"
    },
    "import/resolver": {
      "typescript": {
        "alwaysTryTypes": true,
        "project": "./tsconfig.json"
      }
    }
  },
  "overrides": [
    {
      "files": ["*.js", "*.jsx"],
      "rules": {
        "@typescript-eslint/explicit-function-return-type": "off",
        "@typescript-eslint/explicit-module-boundary-types": "off"
      }
    },
    {
      "files": ["*.test.ts", "*.test.tsx", "*.spec.ts", "*.spec.tsx"],
      "rules": {
        "no-magic-numbers": "off",
        "@typescript-eslint/no-non-null-assertion": "off"
      }
    }
  ],
  "ignorePatterns": [
    "node_modules",
    ".next",
    "out",
    "dist",
    "build",
    "coverage",
    "*.config.js",
    "*.config.ts",
    ".eslintrc.js",
    "next-env.d.ts"
  ]
}
```

---

## 📦 Required ESLint Packages

Install the necessary ESLint packages:

```bash
npm install -D \
  eslint \
  eslint-config-next \
  @typescript-eslint/parser \
  @typescript-eslint/eslint-plugin \
  eslint-plugin-react \
  eslint-plugin-react-hooks \
  eslint-plugin-jsx-a11y \
  eslint-plugin-import \
  eslint-plugin-security \
  eslint-plugin-unused-imports \
  eslint-plugin-no-secrets \
  eslint-import-resolver-typescript \
  eslint-config-prettier
```

---

## 🔧 Prettier Configuration (.prettierrc)

Create `.prettierrc` for consistent formatting:

```json
{
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "semi": true,
  "singleQuote": true,
  "quoteProps": "as-needed",
  "jsxSingleQuote": false,
  "trailingComma": "es5",
  "bracketSpacing": true,
  "bracketSameLine": false,
  "arrowParens": "always",
  "requirePragma": false,
  "insertPragma": false,
  "proseWrap": "preserve",
  "htmlWhitespaceSensitivity": "css",
  "endOfLine": "lf",
  "embeddedLanguageFormatting": "auto",
  "singleAttributePerLine": false
}
```

Create `.prettierignore`:

```
node_modules
.next
out
dist
build
coverage
*.min.js
*.min.css
package-lock.json
yarn.lock
pnpm-lock.yaml
.env*
```

---

## 🎯 Strict Type Examples

### Example: Proper Type Definitions

Create `src/types/strict-examples.ts`:

```typescript
// ✅ GOOD: Strict type definitions
export interface Transaction {
  readonly id: string;
  readonly userId: string;
  personalId: number;
  date: Date;
  accountId: string;
  categoryId: string;
  amount: number;
  type: 'income' | 'expense'; // Use union types, not string
  description?: string; // Optional fields marked explicitly
  payee?: string;
  labels: readonly Label[]; // Readonly arrays
}

// ✅ GOOD: Use discriminated unions for different states
export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

// ✅ GOOD: Strict function signatures
export function calculateBalance(
  transactions: readonly Transaction[]
): number {
  return transactions.reduce((sum, tx) => {
    return tx.type === 'expense' ? sum - Math.abs(tx.amount) : sum + Math.abs(tx.amount);
  }, 0);
}

// ✅ GOOD: Type guards
export function isTransaction(data: unknown): data is Transaction {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'amount' in data &&
    typeof (data as Transaction).id === 'string' &&
    typeof (data as Transaction).amount === 'number'
  );
}

// ✅ GOOD: Exhaustive checks
export function getTransactionSign(type: Transaction['type']): string {
  switch (type) {
    case 'income':
      return '+';
    case 'expense':
      return '-';
    default:
      // This will error if a new type is added to the union
      const _exhaustive: never = type;
      throw new Error(`Unknown transaction type: ${_exhaustive}`);
  }
}

// ❌ BAD: Avoid these patterns
// No any types
// const data: any = fetchData();

// No non-null assertions
// const name = user!.name;

// No implicit any
// function process(data) { } // Missing type annotations

// No loose checks
// if (user.name) { } // Should be: if (user?.name !== undefined)
```

---

## 🛠️ VS Code Settings

Create `.vscode/settings.json` for consistent development experience:

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "typescript.preferences.includeInlayParameterNameHints": "all",
  "typescript.preferences.includeInlayFunctionParameterTypeHints": true,
  "typescript.preferences.includeInlayVariableTypeHints": true,
  "typescript.preferences.includeInlayPropertyDeclarationTypeHints": true,
  "typescript.preferences.includeInlayFunctionLikeReturnTypeHints": true,
  "typescript.preferences.includeInlayEnumMemberValueHints": true,
  "javascript.validate.enable": false,
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ],
  "eslint.run": "onType",
  "eslint.probe": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ],
  "files.exclude": {
    "**/.git": true,
    "**/.DS_Store": true,
    "**/node_modules": true,
    "**/.next": true,
    "**/out": true,
    "**/build": true,
    "**/dist": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/.next": true,
    "**/out": true,
    "**/build": true,
    "**/dist": true,
    "**/coverage": true
  }
}
```

---

## 🚨 Common Strict Mode Errors and Fixes

### 1. Undefined Array Access
```typescript
// ❌ ERROR: Object is possibly 'undefined'
const firstAccount = accounts[0].name;

// ✅ FIX: Handle undefined
const firstAccount = accounts[0]?.name ?? 'No account';
```

### 2. Null/Undefined Checks
```typescript
// ❌ ERROR: Strict boolean check fails
if (user.email) { }

// ✅ FIX: Explicit check
if (user.email !== undefined && user.email !== '') { }
```

### 3. Async/Await
```typescript
// ❌ ERROR: Floating promise
fetchData();

// ✅ FIX: Handle promise
await fetchData();
// or
void fetchData();
```

### 4. Type Assertions
```typescript
// ❌ ERROR: Unnecessary type assertion
const name = (user as User).name;

// ✅ FIX: Proper type checking
const name = isUser(user) ? user.name : undefined;
```

### 5. Return Types
```typescript
// ❌ ERROR: Missing return type
function calculate(a: number, b: number) {
  return a + b;
}

// ✅ FIX: Explicit return type
function calculate(a: number, b: number): number {
  return a + b;
}
```

---

## ✅ Configuration Checklist

- [ ] tsconfig.json created with strict settings
- [ ] All strict flags enabled in TypeScript
- [ ] .eslintrc.json configured with strict rules
- [ ] Required ESLint plugins installed
- [ ] .prettierrc configured
- [ ] VS Code settings configured
- [ ] npm run type-check passes with 0 errors
- [ ] npm run lint passes with 0 errors
- [ ] Build completes successfully

---

## 🎯 Benefits of Strict Configuration

1. **Catch bugs at compile time** - Not at runtime
2. **Enforce consistent code style** - Team-wide standards
3. **Prevent common mistakes** - No implicit any, no floating promises
4. **Better IntelliSense** - More accurate autocomplete
5. **Safer refactoring** - Compiler catches breaking changes
6. **Security improvements** - No eval, no secrets in code
7. **Accessibility compliance** - ARIA rules enforced
8. **Performance hints** - Catch inefficient patterns

With these strict configurations, you'll catch most bugs during development, not in production!
