# Generate TREE.md
.PHONY: tree
tree: ## Generate project structure tree
	@echo "$(GREEN)Generating TREE.md...$(NC)"
	@gotree --gitignore --exclude-hidden