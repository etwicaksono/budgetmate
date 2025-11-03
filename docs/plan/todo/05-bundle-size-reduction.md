# Bundle Size Reduction

## Objective
Reduce JavaScript bundle size by at least 30% to improve initial load time and performance.

## Implementation Prompt

```
Optimize bundle size through:

1. Replace heavy libraries with lighter alternatives
2. Implement code splitting and lazy loading
3. Tree shake unused code
4. Optimize imports and dependencies
5. Configure webpack for production
6. Compress and optimize assets
```

## Key Optimizations

### Library Replacements
- moment.js → date-fns
- lodash → lodash-es or native
- Large icon libraries → specific imports

### Code Splitting
- Route-based splitting
- Component lazy loading
- Dynamic imports for features

### Build Optimization
- Enable SWC minification
- Configure chunk splitting
- Remove dead code
- Optimize images

## Success Criteria
- [ ] Bundle reduced by 30%
- [ ] First load JS < 200KB
- [ ] All routes code-split
- [ ] No duplicate modules
