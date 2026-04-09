'use client';

import React, { useState } from 'react';
import { Card, Col, Modal } from 'react-bootstrap';
import { FaGripVertical, FaExpand, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/**
 * WidgetCard - Sortable Widget Card with Drag & Drop
 * 
 * Wrapper component for dashboard widgets that adds:
 * - Drag and drop functionality
 * - Expand to fullscreen
 * - Consistent card styling
 * 
 * Follows Single Responsibility Principle: Only handles widget card UI and drag behavior
 */

export interface WidgetConfig {
  title: string;
  component: React.ReactNode;
}

interface SortableWidgetCardProps {
  widgetId: string;
  widget: WidgetConfig;
  visibility: boolean;
  onToggleVisibility: (widgetKey: string) => void;
}

export const SortableWidgetCard: React.FC<SortableWidgetCardProps> = ({
  widgetId,
  widget,
  visibility,
  onToggleVisibility,
}) => {
  const [showModal, setShowModal] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widgetId });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    height: '450px',
  };

  const handleExpandModal = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  return (
    <>
      <Col lg={4} md={6} sm={12} className="mb-4 d-flex" ref={setNodeRef} style={style}>
        <Card className="h-100 w-100 shadow-sm">
          <Card.Header className="d-flex justify-content-between align-items-center bg-white border-bottom">
            <span className="fw-bold">{widget.title}</span>
            <div className="d-flex gap-2 align-items-center">
              <span className="d-none d-md-inline-flex">
                <FaExpand
                  size={14}
                  className="text-muted"
                  style={{ cursor: 'pointer' }}
                  title="Expand to fullscreen"
                  onClick={handleExpandModal}
                />
              </span>
              {visibility ? (
                <FaEye
                  size={14}
                  className="text-muted"
                  style={{ cursor: 'pointer' }}
                  title="Hide widget"
                  onClick={() => onToggleVisibility(widgetId)}
                />
              ) : (
                <FaEyeSlash
                  size={14}
                  className="text-muted"
                  style={{ cursor: 'pointer' }}
                  title="Show widget"
                  onClick={() => onToggleVisibility(widgetId)}
                />
              )}
              <div style={{ cursor: 'grab' }} {...attributes} {...listeners}>
                <FaGripVertical size={14} className="text-muted" title="Drag to reorder" />
              </div>
            </div>
          </Card.Header>
          <Card.Body className="p-0" style={{ overflow: 'hidden' }}>
            <div style={{ height: '100%', width: '100%' }}>
              {widget.component}
            </div>
          </Card.Body>
        </Card>
      </Col>

      {/* Fullscreen Modal */}
      <Modal
        show={showModal}
        onHide={handleCloseModal}
        fullscreen={true}
      >
        <Modal.Header closeButton className="border-0 pb-0 shadow-sm z-1">
          <Modal.Title>{widget.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0 d-flex flex-column position-relative">
          <div className="flex-grow-1 w-100" style={{ minHeight: 0 }}>
            {React.isValidElement(widget.component)
              ? React.cloneElement(widget.component as React.ReactElement<{ height?: string }>, {
                  height: '100%',
                })
              : widget.component}
          </div>
        </Modal.Body>
      </Modal>
    </>
  );
};

/**
 * WidgetCard for DragOverlay
 */
interface WidgetCardProps {
  widget: WidgetConfig;
}

export const WidgetCard: React.FC<WidgetCardProps> = ({ widget }) => {
  return (
    <div style={{ width: '400px', height: '450px' }}>
      <Card className="h-100 w-100 shadow">
        <Card.Header className="d-flex justify-content-between align-items-center bg-white">
          <span className="fw-bold">{widget.title}</span>
          <div className="d-flex gap-2 align-items-center">
            <FaGripVertical size={14} className="text-muted" />
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          <div style={{ height: '100%', width: '100%' }}>
            {widget.component}
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};
