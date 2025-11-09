import React, { useState, type ChangeEvent, type FormEvent } from 'react';
// TODO: Align templates management with upcoming automation features.
import { Button, Card, Form } from 'react-bootstrap';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import type { ComponentType } from 'react';
import type { IconType } from 'react-icons';
import './Templates.css';

type TemplateType = 'expense' | 'income';

interface Template {
   id: number;
   name: string;
   amount: number;
   type: TemplateType;
   category: string;
   description: string;
}

interface TemplateFormState {
   name: string;
   amount: string;
   type: TemplateType;
   category: string;
   description: string;
}

type IconComponent = ComponentType<{ size?: number; className?: string }>;

const toIconComponent = (icon: IconType): IconComponent =>
   icon as unknown as IconComponent;

const PlusIcon = toIconComponent(FaPlus);
const EditIcon = toIconComponent(FaEdit);
const TrashIcon = toIconComponent(FaTrash);

const DEFAULT_TEMPLATES: Template[] = [
   {
      id: 1,
      name: 'Monthly Rent',
      amount: 1_500_000,
      type: 'expense',
      category: 'Housing',
      description: 'Monthly apartment rent payment',
   },
   {
      id: 2,
      name: 'Salary',
      amount: 5_000_000,
      type: 'income',
      category: 'Salary',
      description: 'Monthly salary from company',
   },
];

const EMPTY_TEMPLATE_FORM: TemplateFormState = {
   name: '',
   amount: '',
   type: 'expense',
   category: '',
   description: '',
};

const Templates: React.FC = () => {
   const [templates, setTemplates] = useState<Template[]>(DEFAULT_TEMPLATES);
   const [newTemplate, setNewTemplate] = useState<TemplateFormState>(EMPTY_TEMPLATE_FORM);

   const handleInputChange =
      (field: keyof TemplateFormState) =>
      (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>): void => {
         const { value } = event.target;
         setNewTemplate((prev) => ({
            ...prev,
            [field]: value,
         }));
      };

   const handleAddTemplate = (event: FormEvent<HTMLFormElement>): void => {
      event.preventDefault();
      const trimmedName = newTemplate.name.trim();
      const parsedAmount = Number.parseFloat(newTemplate.amount);
      if (!trimmedName || Number.isNaN(parsedAmount) || parsedAmount < 0) {
         return;
      }

      const nextTemplate: Template = {
         id: Date.now(),
         name: trimmedName,
         amount: parsedAmount,
         type: newTemplate.type,
         category: newTemplate.category.trim() || 'Uncategorized',
         description: newTemplate.description.trim(),
      };

      setTemplates((prev) => [nextTemplate, ...prev]);
      setNewTemplate(EMPTY_TEMPLATE_FORM);
   };

   return (
      <div className="templates-section">
         <div className="d-flex justify-content-between align-items-center mb-4">
            <h2>Templates</h2>
         </div>

         <div className="templates-add mb-4">
            <h3 className="h5 mb-3">Create a new template</h3>
            <Form onSubmit={handleAddTemplate}>
               <div className="row g-3">
                  <div className="col-md-6">
                     <Form.Group>
                        <Form.Label>Template name</Form.Label>
                        <Form.Control
                           type="text"
                           value={newTemplate.name}
                           onChange={handleInputChange('name')}
                           placeholder="e.g., Monthly Rent"
                        />
                     </Form.Group>
                  </div>
                  <div className="col-md-6">
                     <Form.Group>
                        <Form.Label>Amount</Form.Label>
                        <Form.Control
                           type="number"
                           value={newTemplate.amount}
                           onChange={handleInputChange('amount')}
                           placeholder="0"
                           min="0"
                           step="0.01"
                        />
                     </Form.Group>
                  </div>
                  <div className="col-md-6">
                     <Form.Group>
                        <Form.Label>Type</Form.Label>
                        <Form.Select
                           value={newTemplate.type}
                           onChange={handleInputChange('type')}
                        >
                           <option value="expense">Expense</option>
                           <option value="income">Income</option>
                        </Form.Select>
                     </Form.Group>
                  </div>
                  <div className="col-md-6">
                     <Form.Group>
                        <Form.Label>Category</Form.Label>
                        <Form.Select
                           value={newTemplate.category}
                           onChange={handleInputChange('category')}
                        >
                           <option value="">Select category</option>
                           <option value="Housing">Housing</option>
                           <option value="Food">Food</option>
                           <option value="Transportation">Transportation</option>
                           <option value="Salary">Salary</option>
                        </Form.Select>
                     </Form.Group>
                  </div>
                  <div className="col-12">
                     <Form.Group>
                        <Form.Label>Description</Form.Label>
                        <Form.Control
                           as="textarea"
                           rows={2}
                           value={newTemplate.description}
                           onChange={handleInputChange('description')}
                           placeholder="Add a description..."
                        />
                     </Form.Group>
                  </div>
                  <div className="col-12">
                     <Button variant="success" type="submit">
                        <PlusIcon className="me-2" size={12} />
                        Create Template
                     </Button>
                  </div>
               </div>
            </Form>
         </div>

         <div className="templates-list">
            <h3 className="h5 mb-3">Your templates</h3>
            <div className="row g-3">
               {templates.map((template) => (
                  <div key={template.id} className="col-md-6">
                     <Card className="template-card">
                        <Card.Body>
                           <div className="template-card__header">
                              <div>
                                 <h5 className="template-card__title">{template.name}</h5>
                                 <div className="template-card__category">{template.category}</div>
                              </div>
                              <div className="template-card__actions">
                                 <Button variant="link" className="p-0 me-3">
                                    <EditIcon size={14} />
                                 </Button>
                                 <Button variant="link" className="p-0 text-danger">
                                    <TrashIcon size={14} />
                                 </Button>
                              </div>
                           </div>
                           <div className="template-card__amount">Rp {template.amount.toLocaleString()}</div>
                           <div className="template-card__type">{template.type}</div>
                           {template.description && (
                              <div className="template-card__description">{template.description}</div>
                           )}
                        </Card.Body>
                     </Card>
                  </div>
               ))}
            </div>
         </div>
      </div>
   );
};

export default Templates;
