'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button, Form, ListGroup, Dropdown, InputGroup, Alert } from 'react-bootstrap';
import { FaPlus, FaEllipsisV, FaSearch, FaTags } from 'react-icons/fa';
import Swal from 'sweetalert2';
import { labelService, Label } from '@/services/labelService';
import { LabelModal } from '@/components/label';

export function LabelsSection(): React.ReactElement {
  const [labels, setLabels] = useState<Label[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingLabel, setEditingLabel] = useState<Label | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  const filteredLabels = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    return labels.filter(label => 
      label.name.toLowerCase().includes(searchLower)
    );
  }, [labels, searchTerm]);
  
  const loadLabels = useCallback(async () => {
    try {
      setLoading(true);
      const response = await labelService.fetchLabels();
      setLabels(response.data);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage('Failed to load labels');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    void loadLabels();
  }, [loadLabels]);
  
  const handleSaveLabel = async (data: { name: string; color: string }) => {
    try {
      if (modalMode === 'edit' && editingLabel) {
        await labelService.updateLabel(editingLabel.id, data);
        setSuccessMessage('Label updated successfully');
      } else {
        await labelService.createLabel(data);
        setSuccessMessage('Label created successfully');
      }
      
      await loadLabels();
      setShowModal(false);
      setEditingLabel(null);
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error && 'response' in error && error.response && 
                           typeof error.response === 'object' && 'data' in error.response &&
                           error.response.data && typeof error.response.data === 'object' &&
                           'message' in error.response.data
                           ? (error.response.data as { message: string }).message
                           : 'Failed to save label';
      setErrorMessage(errorMessage);
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };
  
  const handleOpenAddModal = () => {
    setModalMode('add');
    setEditingLabel(null);
    setShowModal(true);
  };
  
  const handleOpenEditModal = (label: Label) => {
    setModalMode('edit');
    setEditingLabel(label);
    setShowModal(true);
  };
  
  const handleDeleteLabel = async (label: Label) => {
    const result = await Swal.fire({
      title: 'Delete Label',
      html: `
        <p>Are you sure you want to delete this label?</p>
        <div class="d-flex justify-content-center mt-3">
          <span class="badge" style="background-color: ${label.color}; font-size: 1rem; padding: 0.5rem 1rem;">
            ${label.name}
          </span>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      reverseButtons: true,
    });
    
    if (result.isConfirmed) {
      try {
        await labelService.deleteLabel(label.id);
        setSuccessMessage('Label deleted successfully');
        await loadLabels();
        setTimeout(() => setSuccessMessage(''), 3000);
      } catch {
        const errorMsg = 'Failed to delete label';
        await Swal.fire({
          title: 'Cannot Delete Label',
          text: errorMsg,
          icon: 'error',
          confirmButtonColor: '#0d6efd',
        });
      }
    }
  };
  
  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Labels</h2>
          <p className="text-muted mb-0">
            Organize transactions with custom labels.
          </p>
        </div>
        <Button variant="primary" onClick={handleOpenAddModal}>
          <FaPlus className="me-2" />
          Add Label
        </Button>
      </div>
      
      {successMessage && (
        <Alert variant="success" dismissible onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      )}
      
      {errorMessage && (
        <Alert variant="danger" dismissible onClose={() => setErrorMessage('')}>
          {errorMessage}
        </Alert>
      )}
      
      {/* Search */}
      <div className="mb-3">
        <InputGroup>
          <InputGroup.Text>
            <FaSearch />
          </InputGroup.Text>
          <Form.Control
            type="text"
            placeholder="Search labels..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </InputGroup>
      </div>
      
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : filteredLabels.length === 0 ? (
        <div className="text-center py-5">
          <div className="d-flex justify-content-center mb-3">
            <FaTags size={48} className="text-muted" />
          </div>
          <p className="text-muted">
            {searchTerm ? 'No labels found matching your search.' : 'No labels yet. Click "Add Label" to create your first label.'}
          </p>
        </div>
      ) : (
        <ListGroup className="text-center">
          {filteredLabels.map((label) => (
            <ListGroup.Item
              key={label.id}
              className="d-flex justify-content-between align-items-center label-list-item"
              style={{ 
                borderLeft: `4px solid ${label.color}`,
                cursor: 'pointer'
              }}
              onClick={() => handleOpenEditModal(label)}
            >
              <div className="d-flex align-items-center gap-3 flex-grow-1">
                <span
                  className="badge"
                  style={{
                    backgroundColor: label.color,
                    fontSize: '0.875rem',
                    padding: '0.5rem 1rem',
                  }}
                >
                  {label.name}
                </span>
                <span className="text-muted small">{label.color}</span>
              </div>
              
              <div 
                className="label-item-actions"
                onClick={(e) => e.stopPropagation()}
              >
                <Dropdown align="end">
                  <Dropdown.Toggle
                    as="button"
                    className="btn btn-link text-muted p-0 border-0 bg-transparent label-menu-toggle"
                    id={`menu-${label.id}`}
                    bsPrefix="label-menu"
                  >
                    <FaEllipsisV size={16} />
                  </Dropdown.Toggle>
                  
                  <Dropdown.Menu>
                    <Dropdown.Item 
                      onClick={() => handleOpenEditModal(label)}
                    >
                      Edit
                    </Dropdown.Item>
                    <Dropdown.Divider />
                    <Dropdown.Item
                      className="text-danger"
                      onClick={() => handleDeleteLabel(label)}
                    >
                      Delete
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </div>
            </ListGroup.Item>
          ))}
        </ListGroup>
      )}
      
      {/* Label Modal */}
      <LabelModal
        show={showModal}
        mode={modalMode}
        label={editingLabel}
        onHide={() => {
          setShowModal(false);
          setEditingLabel(null);
        }}
        onSave={handleSaveLabel}
      />
    </div>
  );
}
