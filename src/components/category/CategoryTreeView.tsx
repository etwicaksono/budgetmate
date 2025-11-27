import React, { useState, useMemo } from 'react';
import { Card, Button, Badge, Dropdown, Form } from 'react-bootstrap';
import { 
  FaChevronRight, 
  FaChevronDown, 
  FaEdit, 
  FaTrash, 
  FaEllipsisV,
  FaPlus 
} from 'react-icons/fa';
import { Icon } from '@/utils/iconResolver';
import { type Category } from '@/services/categoryService';
import Swal from 'sweetalert2';

interface CategoryTreeViewProps {
  categories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  onAddChild: (parentCategory: Category) => void;
}

interface TreeNode extends Category {
  children: TreeNode[];
}

export const CategoryTreeView: React.FC<CategoryTreeViewProps> = ({
  categories,
  onEdit,
  onDelete,
  onAddChild,
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // Build tree structure
  const categoryTree = useMemo(() => {
    const parentCategories = categories.filter(cat => !cat.parent_id);
    
    const buildTree = (parent: Category): TreeNode => {
      const children = categories
        .filter(cat => cat.parent_id === parent.id)
        .map(child => buildTree(child));
      
      return { ...parent, children };
    };

    return parentCategories.map(parent => buildTree(parent));
  }, [categories]);

  // Filter tree by search
  const filteredTree = useMemo(() => {
    if (!searchQuery.trim()) return categoryTree;

    const query = searchQuery.toLowerCase();
    
    const filterNode = (node: TreeNode): TreeNode | null => {
      const matchesSearch = node.name.toLowerCase().includes(query);
      const filteredChildren = node.children
        .map(child => filterNode(child))
        .filter((child): child is TreeNode => child !== null);

      if (matchesSearch || filteredChildren.length > 0) {
        return { ...node, children: filteredChildren };
      }

      return null;
    };

    return categoryTree
      .map(node => filterNode(node))
      .filter((node): node is TreeNode => node !== null);
  }, [categoryTree, searchQuery]);

  // Toggle expand/collapse
  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Expand all
  const expandAll = () => {
    const allParentIds = categories
      .filter(cat => !cat.parent_id)
      .map(cat => cat.id);
    setExpandedIds(new Set(allParentIds));
  };

  // Collapse all
  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  // Handle delete with confirmation
  const handleDeleteClick = async (category: Category) => {
    const hasChildren = categories.some(cat => cat.parent_id === category.id);
    const hasTransactions = (category.transaction_count || 0) > 0;

    let message = `Are you sure you want to delete "${category.name}"?`;
    if (hasChildren) {
      message += '\n\nThis will also delete all child categories.';
    }
    if (hasTransactions) {
      message += `\n\nThis category has ${category.transaction_count} transaction(s).`;
    }

    const result = await Swal.fire({
      title: 'Delete Category?',
      text: message,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, delete it',
      cancelButtonText: 'Cancel',
    });

    if (result.isConfirmed) {
      onDelete(category);
    }
  };

  // Render category node
  const renderCategoryNode = (node: TreeNode, level: number = 0) => {
    const isExpanded = expandedIds.has(node.id);
    const hasChildren = node.children.length > 0;
    const isParent = !node.parent_id;

    return (
      <div key={node.id}>
        <div
          className="d-flex align-items-center py-2 px-3 border-bottom"
          style={{
            paddingLeft: `${level * 2 + 1}rem`,
            backgroundColor: level === 0 ? '#f8f9fa' : 'white',
          }}
        >
          {/* Expand/Collapse Button */}
          {hasChildren ? (
            <Button
              variant="link"
              size="sm"
              className="p-0 me-2"
              onClick={() => toggleExpand(node.id)}
              style={{ width: '20px', textDecoration: 'none', color: '#6c757d' }}
            >
              {isExpanded ? <FaChevronDown /> : <FaChevronRight />}
            </Button>
          ) : (
            <span style={{ width: '20px', display: 'inline-block' }} className="me-2" />
          )}

          {/* Icon */}
          <div
            className="d-flex align-items-center justify-content-center me-3"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              backgroundColor: node.color || '#6c757d',
              color: 'white',
              flexShrink: 0,
            }}
          >
            <Icon name={node.icon} size={16} />
          </div>

          {/* Name & Info */}
          <div className="flex-grow-1">
            <div className="d-flex align-items-center gap-2">
              <span className={`${isParent ? 'fw-bold' : ''}`}>
                {node.name}
              </span>
              
              {/* System Badge */}
              {node.is_system && (
                <Badge bg="secondary" className="small">
                  System
                </Badge>
              )}

              {/* Type Badge */}
              <Badge bg={node.type === 'income' ? 'success' : node.type === 'both' ? 'info' : 'danger'} className="small">
                {node.type}
              </Badge>

              {/* Nature Badge */}
              <Badge 
                bg={node.nature === 'MUST' ? 'danger' : node.nature === 'NEED' ? 'warning' : 'info'} 
                className="small"
              >
                {node.nature}
              </Badge>

              {/* Inactive Badge */}
              {!node.is_active && (
                <Badge bg="secondary" className="small">
                  Inactive
                </Badge>
              )}
            </div>

            {/* Transaction Count */}
            {(node.transaction_count || 0) > 0 && (
              <small className="text-muted">
                {node.transaction_count} transaction{node.transaction_count !== 1 ? 's' : ''}
                {hasChildren && ` · ${node.children.length} subcategor${node.children.length !== 1 ? 'ies' : 'y'}`}
              </small>
            )}
          </div>

          {/* Actions Dropdown */}
          <Dropdown align="end">
            <Dropdown.Toggle
              variant="link"
              size="sm"
              className="text-muted p-0"
              style={{ textDecoration: 'none' }}
            >
              <FaEllipsisV />
            </Dropdown.Toggle>

            <Dropdown.Menu>
              <Dropdown.Item onClick={() => onEdit(node)}>
                <FaEdit className="me-2" />
                Edit
              </Dropdown.Item>
              
              {isParent && (
                <Dropdown.Item onClick={() => onAddChild(node)}>
                  <FaPlus className="me-2" />
                  Add Child Category
                </Dropdown.Item>
              )}
              
              <Dropdown.Divider />
              
              <Dropdown.Item 
                onClick={() => handleDeleteClick(node)}
                className="text-danger"
                disabled={node.is_system}
              >
                <FaTrash className="me-2" />
                Delete
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </div>

        {/* Render children */}
        {isExpanded && hasChildren && (
          <div>
            {node.children.map(child => renderCategoryNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* Search & Controls */}
      <div className="d-flex gap-2 mb-3">
        <Form.Control
          type="text"
          placeholder="Search categories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="sm"
        />
        <Button 
          variant="outline-secondary" 
          size="sm" 
          onClick={expandAll}
          style={{ whiteSpace: 'nowrap' }}
        >
          Expand All
        </Button>
        <Button 
          variant="outline-secondary" 
          size="sm" 
          onClick={collapseAll}
          style={{ whiteSpace: 'nowrap' }}
        >
          Collapse All
        </Button>
      </div>

      {/* Tree View */}
      <Card>
        <Card.Body className="p-0">
          {filteredTree.length === 0 ? (
            <div className="text-center py-5 text-muted">
              {searchQuery ? `No categories found for "${searchQuery}"` : 'No categories yet'}
            </div>
          ) : (
            <div>
              {filteredTree.map(node => renderCategoryNode(node))}
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};
