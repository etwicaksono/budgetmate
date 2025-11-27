'use client';

import React, { useState, useEffect } from 'react';
import { Form, Card, Button, Row, Col } from 'react-bootstrap';
import { useLocale } from '@/context/LocaleContext';
import { useFormattedCurrency } from '@/hooks/useFormattedCurrency';

export function GeneralSection(): React.ReactElement {
  const { locale, setLocale, availableLocales, loading } = useLocale();
  const { formatCurrency } = useFormattedCurrency();
  const [selectedLocale, setSelectedLocale] = useState(locale);
  const [saving, setSaving] = useState(false);

  // Update selected locale when context locale changes
  useEffect(() => {
    setSelectedLocale(locale);
  }, [locale]);

  const handleSave = async () => {
    if (selectedLocale === locale) {
      return; // No change
    }

    setSaving(true);
    try {
      await setLocale(selectedLocale);
    } catch (error) {
      console.error('Failed to save locale:', error);
    } finally {
      setSaving(false);
    }
  };

  // Preview amounts in different currencies
  const previewAmount = 1234.56;
  const previewCurrencies = ['USD', 'EUR', 'GBP', 'JPY'];

  return (
    <div>
      <h2 className="mb-4">General Settings</h2>
      
      {/* Number Format Preference */}
      <Card className="mb-4">
        <Card.Body>
          <h5 className="mb-3">Number Format</h5>
          <p className="text-muted mb-4">
            Choose how numbers and currencies should be displayed throughout the application.
            All currencies will use the same formatting style for consistency.
          </p>

          <Form.Group as={Row} className="mb-3">
            <Form.Label column sm={3}>
              Format Style
            </Form.Label>
            <Col sm={9}>
              <Form.Select
                value={selectedLocale}
                onChange={(e) => setSelectedLocale(e.target.value)}
                disabled={loading}
              >
                {availableLocales.map((localeOption) => (
                  <option key={localeOption.code} value={localeOption.code}>
                    {localeOption.name} ({localeOption.numberFormat})
                  </option>
                ))}
              </Form.Select>
              <Form.Text className="text-muted">
                This affects how numbers are displayed across the entire app
              </Form.Text>
            </Col>
          </Form.Group>

          {/* Preview */}
          <div className="mt-4 p-3 bg-light rounded">
            <h6 className="mb-3">Preview:</h6>
            <Row>
              {previewCurrencies.map((currency) => (
                <Col key={currency} xs={6} md={3} className="mb-2">
                  <div className="text-muted small">{currency}</div>
                  <div className="fw-bold">
                    {formatCurrency(previewAmount, currency)}
                  </div>
                </Col>
              ))}
            </Row>
            <div className="mt-3 text-muted small">
              <strong>Note:</strong> All currencies will use the same number format (
              {availableLocales.find(l => l.code === selectedLocale)?.numberFormat}
              ) for visual consistency.
            </div>
          </div>

          <div className="mt-3">
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={saving || selectedLocale === locale || loading}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
            {selectedLocale !== locale && (
              <Button
                variant="outline-secondary"
                className="ms-2"
                onClick={() => setSelectedLocale(locale)}
              >
                Cancel
              </Button>
            )}
          </div>
        </Card.Body>
      </Card>

      {/* Future settings sections can go here */}
      <Card className="mb-4">
        <Card.Body>
          <h5 className="mb-3">Other Settings</h5>
          <p className="text-muted">Additional general settings coming soon...</p>
        </Card.Body>
      </Card>
    </div>
  );
}
