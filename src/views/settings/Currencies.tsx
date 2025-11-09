import React, { useState, type ChangeEvent, type FormEvent } from 'react';
// TODO: Hook currency settings into live exchange data sources.
import { Button, Form, Table } from 'react-bootstrap';
import { FaPlus } from 'react-icons/fa';
import './Currencies.css';

interface Currency {
   code: string;
   name: string;
   rate: number;
   isBase: boolean;
}

const DEFAULT_CURRENCIES: Currency[] = [
   { code: 'IDR', name: 'Indonesian Rupiah', rate: 1, isBase: true },
];

type IconComponentProps = {
   size?: number;
   className?: string;
   color?: string;
};

const PlusIcon = FaPlus as unknown as React.ComponentType<IconComponentProps>;

const Currencies: React.FC = () => {
   const [currencies] = useState<Currency[]>(DEFAULT_CURRENCIES);
   const [newCurrency, setNewCurrency] = useState<string>('');

   const handleAddCurrency = (event: FormEvent<HTMLFormElement>): void => {
      event.preventDefault();
      // Implementation for adding new currency
      console.log('Add currency:', newCurrency);
   };

   const handleNewCurrencyChange = (event: ChangeEvent<HTMLSelectElement>): void => {
      setNewCurrency(event.target.value);
   };

   return (
      <div className="currencies-section">
         <div className="d-flex justify-content-between align-items-center mb-4">
            <h2>Currencies</h2>
         </div>

         <div className="currencies-add mb-4">
            <h3 className="h5 mb-3">Add a new currency</h3>
            <Form onSubmit={handleAddCurrency} className="d-flex gap-2">
               <Form.Group className="flex-grow-1">
                  <Form.Select value={newCurrency} onChange={handleNewCurrencyChange}>
                     <option value="">Currency name</option>
                     <option value="USD">US Dollar (USD)</option>
                     <option value="EUR">Euro (EUR)</option>
                     <option value="GBP">British Pound (GBP)</option>
                     {/* Add more currency options */}
                  </Form.Select>
               </Form.Group>
               <Button variant="success" type="submit">
                  <PlusIcon className="me-2" size={12} />
                  Add
               </Button>
            </Form>
         </div>

         <div className="currencies-list">
            <h3 className="h5 mb-3">Your currencies</h3>
            <Table hover className="currencies-table">
               <thead>
                  <tr>
                     <th>Name</th>
                     <th>Exchange rate</th>
                     <th></th>
                  </tr>
               </thead>
               <tbody>
                  {currencies.map((currency) => (
                     <tr key={currency.code}>
                        <td>
                           <div className="currency-name">
                              <span className="currency-code">{currency.code}</span>
                              <span className="currency-full-name">{currency.name}</span>
                           </div>
                        </td>
                        <td>
                           {currency.isBase ? (
                              'This is your base currency'
                           ) : (
                              <Form.Control
                                 type="number"
                                 value={currency.rate}
                                 step="0.0001"
                                 min="0"
                                 className="exchange-rate-input"
                              />
                           )}
                        </td>
                        <td className="text-end">
                           {!currency.isBase && (
                              <Button variant="link" className="text-danger p-0">
                                 Remove
                              </Button>
                           )}
                        </td>
                     </tr>
                  ))}
               </tbody>
            </Table>
         </div>
      </div>
   );
};

export default Currencies;
