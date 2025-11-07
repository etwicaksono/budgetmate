import React, { useState } from 'react';
import { Col, Card, Modal } from 'react-bootstrap';
import { FaGripVertical, FaEye, FaEyeSlash, FaExpand } from 'react-icons/fa';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable Widget Card Component
export interface SortableWidgetCardProps {
  widgetId: string;
  widget: { title: string; component: React.ReactNode };
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

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
    height: '450px',
  };

  const expandModal = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  return (
    <>
      <Col lg={4} className="mb-4 d-flex" ref={setNodeRef} style={style}>
        <Card className="h-100 w-100" style={{ display: 'flex', flexDirection: 'column' }}>
          <Card.Header className="d-flex justify-content-between align-items-center">
            <span>{widget.title}</span>
            <div className="d-flex gap-2 align-items-center">
              <FaExpand
                size={16}
                style={{ cursor: 'pointer', color: '#6c757d' }}
                title="Expand to fullscreen"
                onClick={expandModal}
              />
              {visibility ? (
                <FaEye
                  size={16}
                  style={{ cursor: 'pointer', color: '#6c757d' }}
                  title="Hide widget"
                  onClick={() => onToggleVisibility(widgetId)}
                />
              ) : (
                <FaEyeSlash
                  size={16}
                  style={{ cursor: 'pointer', color: '#6c757d' }}
                  title="Show widget"
                  onClick={() => onToggleVisibility(widgetId)}
                />
              )}
              <div style={{ cursor: 'grab' }} {...attributes} {...listeners}>
                <FaGripVertical
                  size={16}
                  style={{ color: '#6c757d' }}
                  title="Drag to reorder"
                />
              </div>
            </div>
          </Card.Header>
          {visibility && (
            <Card.Body style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
              <div style={{ flex: 1, width: '100%', height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                {widget.component}
              </div>
            </Card.Body>
          )}
        </Card>
      </Col>

      {/* Fullscreen Modal */}
      <Modal
        show={showModal}
        onHide={handleCloseModal}
        dialogClassName="modal-fullscreen-custom"
      >
        <style>{`
          .modal-fullscreen-custom {
            max-width: calc(100vw - 5rem);
            margin: 2.5rem auto;
          }
          .modal-fullscreen-custom .modal-content {
            height: calc(100vh - 5rem);
            display: flex;
            flex-direction: column;
          }
          .modal-fullscreen-custom .modal-body {
            flex: 1;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            padding: 0;
          }
          .widget-modal-content {
            flex: 1;
            width: 100%;
            min-height: 0;
            display: flex;
            flex-direction: column;
          }
        `}</style>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title>{widget.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="widget-modal-content">
            {React.isValidElement(widget.component)
              ? React.cloneElement(widget.component as React.ReactElement<any>, {
                  height: '100%',
                })
              : widget.component}
          </div>
        </Modal.Body>
      </Modal>
    </>
  );
};

// Widget Card for DragOverlay
export interface WidgetCardProps {
  widgetId: string;
  widget: { title: string; component: React.ReactNode };
  visibility: boolean;
}

export const WidgetCard: React.FC<WidgetCardProps> = ({ widgetId, widget, visibility }) => {
  return (
    <div style={{ width: '350px', height: '400px' }}>
      <Card className="h-100 w-100">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <span>{widget.title}</span>
          <div className="d-flex gap-2 align-items-center">
            {visibility ? (
              <FaEye
                size={16}
                style={{ color: '#6c757d' }}
                title="Hide widget"
              />
            ) : (
              <FaEyeSlash
                size={16}
                style={{ color: '#6c757d' }}
                title="Show widget"
              />
            )}
            <div style={{ cursor: 'grabbing' }}>
              <FaGripVertical
                size={16}
                style={{ color: '#6c757d' }}
                title="Drag to reorder"
              />
            </div>
          </div>
        </Card.Header>
        {visibility && <Card.Body>{widget.component}</Card.Body>}
      </Card>
    </div>
  );
};
