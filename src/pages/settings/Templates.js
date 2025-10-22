import React, { useState } from 'react';
import { Button, Card, Form } from 'react-bootstrap';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import './Templates.css';

const Templates = () => {
   const [templates, setTemplates] = useState([
      {
         id: 1,
         name: 'Monthly Rent',
         amount: 1500000,
         type: 'expense',
         category: 'Housing',
         description: 'Monthly apartment rent payment',
      },
      {
         id: 2,
         name: 'Salary',
         amount: 5000000,
         type: 'income',
         category: 'Salary',
         description: 'Monthly salary from company',
      },
   ]);

   const [newTemplate, setNewTemplate] = useState({
      name: '',
      amount: '',
      type: 'expense',
      category: '',
      description: '',
   });

   const handleAddTemplate = (e) => {
      e.preventDefault();
      // Implementation for adding new template
      console.log('Add template:', newTemplate);
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
                           onChange={(e) =>
                              setNewTemplate({ ...newTemplate, name: e.target.value })
                           }
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
                           onChange={(e) =>
                              setNewTemplate({ ...newTemplate, amount: e.target.value })
                           }
                           placeholder="0"
                        />
                     </Form.Group>
                  </div>
                  <div className="col-md-6">
                     <Form.Group>
                        <Form.Label>Type</Form.Label>
                        <Form.Select
                           value={newTemplate.type}
                           onChange={(e) =>
                              setNewTemplate({ ...newTemplate, type: e.target.value })
                           }
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
                           onChange={(e) =>
                              setNewTemplate({ ...newTemplate, category: e.target.value })
                           }
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
                           onChange={(e) =>
                              setNewTemplate({ ...newTemplate, description: e.target.value })
                           }
                           placeholder="Add a description..."
                        />
                     </Form.Group>
                  </div>
                  <div className="col-12">
                     <Button variant="success" type="submit">
                        <FaPlus className="me-2" size={12} />
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
                                 <div className="template-card__category">
                                    {template.category}
                                 </div>
                              </div>
                              <div className="template-card__actions">
                                 <Button variant="link" className="p-0 me-3">
                                    <FaEdit size={14} />
                                 </Button>
                                 <Button variant="link" className="p-0 text-danger">
                                    <FaTrash size={14} />
                                 </Button>
                              </div>
                           </div>
                           <div className="template-card__amount">
                              Rp {template.amount.toLocaleString()}
                           </div>
                           <div className="template-card__type">{template.type}</div>
                           {template.description && (
                              <div className="template-card__description">
                                 {template.description}
                              </div>
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