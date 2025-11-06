import React from 'react';
import { Col, Card } from 'react-bootstrap';
import { FaGripVertical, FaEye, FaEyeSlash } from 'react-icons/fa';
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
  };

  return (
    <Col lg={4} className="mb-4 d-flex" ref={setNodeRef} style={style}>
      <Card className="h-100 w-100">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <span>{widget.title}</span>
          <div className="d-flex gap-2 align-items-center">
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
        {visibility && <Card.Body>{widget.component}</Card.Body>}
      </Card>
    </Col>
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
