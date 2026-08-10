'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap';
import { TransactionCategorySelect } from '@/components/transaction/TransactionCategorySelect';
import { LabelMultiSelect } from '@/components/transaction/LabelMultiSelect';
import { useTransactionData } from '@/hooks/useTransactionData';
import { PAYMENT_METHOD_OPTIONS, PAYMENT_STATUS_OPTIONS } from '@/utils/constants';
import {
  buildBulkEditPayload,
  hasBulkEditChanges,
  type BulkEditValues
} from '@/lib/transactions/bulkEditPayload';

export type { BulkEditValues };

export interface BulkEditModalProps {
  show: boolean;
  onHide: () => void;
  targetCount: number;
  isGlobalSelectAll: boolean;
  /** Rejects on failure so the modal stays open; the caller surfaces the error. */
  onSubmit: (values: BulkEditValues) => Promise<void>;
}

const NO_CHANGE = '';

export function BulkEditModal({
  show,
  onHide,
  targetCount,
  isGlobalSelectAll,
  onSubmit,
}: BulkEditModalProps): React.JSX.Element {
  const { labels, isLoading } = useTransactionData();

  const [description, setDescription] = useState('');
  const [payee, setPayee] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>(NO_CHANGE);
  const [paymentStatus, setPaymentStatus] = useState<string>(NO_CHANGE);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [replaceLabels, setReplaceLabels] = useState(false);
  // Once the user picks a mode themselves, their choice is never overridden again
  const [replaceLabelsTouched, setReplaceLabelsTouched] = useState(false);
  const [labelIds, setLabelIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset every field once the modal is dismissed so a reopen starts clean
  useEffect(() => {
    if (show) return;
    setDescription('');
    setPayee('');
    setPaymentMethod(NO_CHANGE);
    setPaymentStatus(NO_CHANGE);
    setCategoryId(null);
    setReplaceLabels(false);
    setReplaceLabelsTouched(false);
    setLabelIds([]);
    setIsSubmitting(false);
  }, [show]);

  const values = useMemo<BulkEditValues>(
    () =>
      buildBulkEditPayload({
        description,
        payee,
        paymentMethod,
        paymentStatus,
        categoryId,
        replaceLabels,
        labelIds,
      }),
    [description, payee, paymentMethod, paymentStatus, categoryId, replaceLabels, labelIds]
  );

  const hasChanges = hasBulkEditChanges(values);

  // The very first label selection flips the mode to replace, which is what most
  // people expect. After that the user owns the toggle and it is left alone.
  const handleLabelsChange = useCallback(
    (ids: string[]): void => {
      setLabelIds(ids);
      if (!replaceLabelsTouched && ids.length > 0) {
        setReplaceLabels(true);
      }
    },
    [replaceLabelsTouched]
  );

  const handleReplaceLabelsChange = useCallback((checked: boolean): void => {
    setReplaceLabelsTouched(true);
    setReplaceLabels(checked);
  }, []);

  // Spells out the outcome of each replace/selection combination
  const labelHelpText = useMemo(() => {
    if (replaceLabels) {
      return labelIds.length === 0
        ? 'All existing labels will be removed.'
        : 'Existing labels will be replaced with the selected ones.';
    }
    return labelIds.length === 0
      ? 'Labels will be left unchanged.'
      : 'Selected labels will be added on top of existing ones.';
  }, [replaceLabels, labelIds]);

  const handleApply = useCallback(async (): Promise<void> => {
    if (!hasChanges) return;
    setIsSubmitting(true);
    try {
      await onSubmit(values);
    } catch {
      // Caller reports the failure; keep the modal open so edits are not lost
    } finally {
      setIsSubmitting(false);
    }
  }, [hasChanges, onSubmit, values]);

  return (
    <Modal show={show} onHide={onHide} size="lg" centered backdrop="static" keyboard={false}>
      <Modal.Header closeButton>
        <Modal.Title>Bulk Edit</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <Alert variant="info" className="py-2">
          <div>
            {isGlobalSelectAll
              ? `Editing ALL ${targetCount} matching transactions`
              : `Editing ${targetCount} transaction(s)`}
          </div>
          <div className="small mt-1">
            Empty fields will be left unchanged. Transfer &amp; debt transactions will be skipped.
          </div>
        </Alert>

        <Form.Group className="mb-3">
          <Form.Label>Category</Form.Label>
          <TransactionCategorySelect
            selectedCategoryId={categoryId}
            onSelect={setCategoryId}
            placeholder="Leave empty to keep unchanged"
            disabled={isSubmitting}
          />
          <Form.Text muted>
            Transactions whose type doesn&apos;t match the selected category will be skipped.
          </Form.Text>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Description</Form.Label>
          <Form.Control
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Leave empty to keep unchanged"
            disabled={isSubmitting}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Payee</Form.Label>
          <Form.Control
            type="text"
            value={payee}
            onChange={(e) => setPayee(e.target.value)}
            placeholder="Leave empty to keep unchanged"
            disabled={isSubmitting}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Payment Method</Form.Label>
          <Form.Select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            disabled={isSubmitting}
          >
            <option value={NO_CHANGE}>-- No change --</option>
            {PAYMENT_METHOD_OPTIONS.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </Form.Select>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Payment Status</Form.Label>
          <Form.Select
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value)}
            disabled={isSubmitting}
          >
            <option value={NO_CHANGE}>-- No change --</option>
            {PAYMENT_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </Form.Select>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Check
            type="checkbox"
            id="bulk-edit-replace-labels"
            label="Replace existing labels"
            checked={replaceLabels}
            onChange={(e) => handleReplaceLabelsChange(e.target.checked)}
            disabled={isSubmitting}
            className="mb-2"
          />
          <LabelMultiSelect
            labels={labels}
            selectedLabelIds={labelIds}
            onChange={handleLabelsChange}
            disabled={isSubmitting || isLoading}
            placeholder="Select labels"
          />
          <Form.Text muted>{labelHelpText}</Form.Text>
        </Form.Group>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onHide} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleApply} disabled={!hasChanges || isSubmitting}>
          {isSubmitting ? <Spinner as="span" animation="border" size="sm" /> : 'Apply'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
