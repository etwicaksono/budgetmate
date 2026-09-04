'use client';

import React, { useState, useRef } from 'react';
import { Row, Col, Card, Button, Alert, Form, ProgressBar } from 'react-bootstrap';
import { FaDatabase, FaDownload, FaUpload, FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaTimes } from 'react-icons/fa';
import { backupService } from '@/services/backupService';
import type { ImportMode, ValidateResponse } from '@/types/backup.types';
import { useAuth } from '@/context/AuthContext';
import { logError } from '@/lib/logger';
import Swal from 'sweetalert2';

export function BackupSection(): React.ReactElement {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  // Export state
  const [isExporting, setIsExporting] = useState(false);

  // Import state
  const [isImporting, setIsImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileValidation, setFileValidation] = useState<ValidateResponse | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>('merge');
  const [importProgress, setImportProgress] = useState(0);

  // Handle export
  const handleExport = async () => {
    setIsExporting(true);
    try {
      await backupService.exportData();

      await Swal.fire({
        icon: 'success',
        title: 'Export Successful',
        text: 'Your data has been exported successfully.',
        confirmButtonColor: '#28a745',
      });
    } catch (error) {
      logError('Export error:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Export Failed',
        text: 'Failed to export data. Please try again.',
        confirmButtonColor: '#dc3545',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Handle file selection
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setImportProgress(0);

    // Validate file
    try {
      const validation = await backupService.validateBackupFile(file);
      setFileValidation(validation);

      if (!validation.valid) {
        await Swal.fire({
          icon: 'error',
          title: 'Invalid File',
          text: validation.error || 'The selected file is not a valid backup.',
          confirmButtonColor: '#dc3545',
        });
      }
    } catch (error) {
      logError('Failed to validate backup file:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to validate backup file.';
      setFileValidation({ valid: false, error: errorMessage });
      await Swal.fire({
        icon: 'error',
        title: 'Validation Failed',
        text: errorMessage,
        toast: true,
        position: 'top-end',
        timer: 3000,
        showConfirmButton: false,
      });
    }
  };

  // Handle import
  const handleImport = async () => {
    if (!selectedFile || !fileValidation?.valid) return;

    // Check if backup belongs to a different account
    const backupEmail = fileValidation.details?.user.email;
    const currentUserEmail = user?.email;
    const isDifferentAccount = backupEmail && currentUserEmail && backupEmail !== currentUserEmail;

    // If different account, handle based on import mode
    if (isDifferentAccount) {
      if (importMode === 'merge') {
        // Merge mode with a different account is not allowed — block entirely
        await Swal.fire({
          icon: 'error',
          title: 'Merge Not Allowed',
          html: `<p>This backup file belongs to <strong>${backupEmail}</strong>, but your current account is <strong>${currentUserEmail}</strong>.</p><p>Merge mode can only be used with your own backup file. Use <strong>Replace</strong> mode if you want to restore data from another account.</p>`,
          confirmButtonColor: '#dc3545',
          confirmButtonText: 'OK',
        });
        return;
      }

      // Replace mode with different account — warn but allow
      const ownershipWarning = await Swal.fire({
        icon: 'warning',
        title: 'Different Account Detected',
        html: `<p>This backup file belongs to <strong>${backupEmail}</strong>.</p><p>Your current account is <strong>${currentUserEmail}</strong>.</p><p><strong>Replace mode will delete all your existing data and restore from this backup.</strong> Are you sure you want to continue?</p>`,
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Yes, Replace All Data',
        cancelButtonText: 'Cancel',
      });

      if (!ownershipWarning.isConfirmed) return;
    }

    // Confirm action (especially for replace mode)
    const confirmResult = await Swal.fire({
      icon: 'warning',
      title: importMode === 'replace' ? 'Replace All Data?' : 'Merge Data?',
      html:
        importMode === 'replace'
          ? '<p><strong>Warning:</strong> This will delete all your existing data!</p><p>Make sure you have a backup before proceeding.</p>'
          : '<p>This will add imported data while keeping your existing data.</p>',
      showCancelButton: true,
      confirmButtonColor: importMode === 'replace' ? '#dc3545' : '#28a745',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, Continue',
      cancelButtonText: 'Cancel',
    });

    if (!confirmResult.isConfirmed) return;

    setIsImporting(true);
    setImportProgress(0);

    try {
      const result = await backupService.importData(
        fileValidation.data!,
        importMode,
        (progress: number) => {
          setImportProgress(progress);
        }
      );

      setImportProgress(100);

      // Show success message
      const imported = result.data?.imported;
      const updated = result.data?.updated;
      const skipped = result.data?.skipped;

      const ENTITY_LABELS: { key: keyof NonNullable<typeof imported>; label: string }[] = [
        { key: 'accounts', label: 'accounts' },
        { key: 'categories', label: 'categories' },
        { key: 'categoryBudgets', label: 'category budgets' },
        { key: 'debts', label: 'debts' },
        { key: 'transactions', label: 'transactions' },
        { key: 'transfers', label: 'transfers' },
        { key: 'labels', label: 'labels' },
        { key: 'transactionLabels', label: 'transaction-label links' },
        { key: 'debtLabels', label: 'debt-label links' },
        { key: 'savedFilters', label: 'saved filters' },
      ];

      const importedRows = ENTITY_LABELS.map(({ key, label }) => {
        const total = imported?.[key] ?? 0;
        const updatedCount = updated?.[key] ?? 0;
        const suffix = updatedCount > 0 ? ` <em>(${updatedCount} updated)</em>` : '';
        return `<li>✓ ${total} ${label}${suffix}</li>`;
      }).join('');

      const skippedTotal = skipped
        ? ENTITY_LABELS.reduce((sum, { key }) => sum + (skipped[key] ?? 0), 0)
        : 0;
      const skippedBlock =
        skippedTotal > 0
          ? `<p style="color: #f59e0b; margin-top: 1rem;">⚠️ ${skippedTotal} record(s) were skipped because a referenced account, category or label was missing from the backup.</p>`
          : '';

      const successResult = await Swal.fire({
        icon: 'success',
        title: 'Import Successful',
        html: `
          <p><strong>Data ${importMode === 'replace' ? 'restored' : 'merged'} successfully!</strong></p>
          ${result.data?.warning ? `<p style="color: #f59e0b; margin-bottom: 1rem;">⚠️ ${result.data.warning}</p>` : ''}
          <ul style="text-align: left; list-style: none; padding: 0;">
            ${importedRows}
          </ul>
          ${skippedBlock}
        `,
        confirmButtonColor: '#28a745',
        confirmButtonText: 'Go to Dashboard',
      });

      // Reset state
      setSelectedFile(null);
      setFileValidation(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Only redirect if user clicked the confirm button
      if (successResult.isConfirmed) {
        window.location.href = '/dashboard';
      }
    } catch (error: unknown) {
      setImportProgress(0);
      logError('Import error:', error);

      const errorMessage = error instanceof Error ? error.message : 'Failed to import data';

      await Swal.fire({
        icon: 'error',
        title: 'Import Failed',
        text: errorMessage,
        confirmButtonColor: '#dc3545',
      });
    } finally {
      setIsImporting(false);
    }
  };

  // Clear selected file
  const clearSelectedFile = () => {
    setSelectedFile(null);
    setFileValidation(null);
    setImportProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      {/* Section Header */}
      <div className="mb-4">
        <h4 className="d-flex align-items-center gap-2 mb-2">
          <FaDatabase size={24} />
          Backup & Restore
        </h4>
        <p className="text-muted mb-0">Export your data for backup or restore from a previous backup</p>
      </div>

      {/* Info Banner */}
      <Alert variant="info" className="d-flex align-items-start mb-4">
        <FaInfoCircle className="me-2 mt-1" size={20} />
        <div>
          <strong>Regular backups protect your financial data</strong>
          <p className="mb-0 mt-1">Export your data weekly and store in multiple secure locations</p>
        </div>
      </Alert>

      {/* Export Section */}
      <Card className="mb-4">
        <Card.Body className="p-4">
          <div className="d-flex gap-4">
            <div style={{ flexShrink: 0 }}>
              <FaDownload size={40} color="#2563eb" />
            </div>
            <div style={{ flex: 1 }}>
              <h5 className="mb-3">Export Data</h5>
              <p className="text-muted mb-3">
                Download all your financial data as a JSON file for backup
              </p>
              <ul className="text-muted mb-4" style={{ fontSize: '0.9rem' }}>
                <li>Includes all accounts, transactions, and categories</li>
                <li>Preserves all relationships and settings</li>
                <li>Can be restored anytime</li>
              </ul>
              <Button
                variant="primary"
                onClick={handleExport}
                disabled={isExporting}
              >
                {isExporting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <FaDownload className="me-2" />
                    Export Data
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Import Section */}
      <Card className="mb-4">
        <Card.Body className="p-4">
          <div className="d-flex gap-4">
            <div style={{ flexShrink: 0 }}>
              <FaUpload size={40} color="#10b981" />
            </div>
            <div style={{ flex: 1 }}>
              <h5 className="mb-3">Import Data</h5>
              <p className="text-muted mb-3">
                Restore your data from a previously exported backup file
              </p>

              {/* Import Mode Selection */}
              <div className="mb-4">
                <label className="form-label fw-bold">Import Mode:</label>
                <div className="d-flex gap-4">
                  <Form.Check
                    type="radio"
                    id="mode-merge"
                    label="Merge (Keep existing data, add imported)"
                    checked={importMode === 'merge'}
                    onChange={() => setImportMode('merge')}
                    disabled={isImporting}
                  />
                  <Form.Check
                    type="radio"
                    id="mode-replace"
                    label="Replace (Delete all existing data)"
                    checked={importMode === 'replace'}
                    onChange={() => setImportMode('replace')}
                    disabled={isImporting}
                  />
                </div>
              </div>

              {/* Warning for Replace mode */}
              {importMode === 'replace' && (
                <Alert variant="warning" className="d-flex align-items-start mb-3">
                  <FaExclamationTriangle className="me-2 mt-1" />
                  <div>
                    <strong>Warning:</strong> Replace mode will permanently delete all your existing data before importing.
                  </div>
                </Alert>
              )}

              {/* File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileSelect}
                className="d-none"
                disabled={isImporting}
              />

              {/* File Selection or Preview */}
              {!selectedFile ? (
                <Button
                  variant="outline-primary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                >
                  <FaDatabase className="me-2" />
                  Select Backup File
                </Button>
              ) : (
                <div className="border rounded p-3 bg-light mb-3">
                  <div className="d-flex align-items-start justify-content-between">
                    <div className="d-flex align-items-start gap-3 flex-grow-1">
                      {fileValidation?.valid ? (
                        <FaCheckCircle size={24} color="#28a745" />
                      ) : (
                        <FaExclamationTriangle size={24} color="#dc3545" />
                      )}
                      <div className="flex-grow-1">
                        <p className="mb-1 fw-bold">{selectedFile.name}</p>
                        {fileValidation?.valid && fileValidation.details && (
                          <>
                            <p className="mb-1 text-muted small">
                              {fileValidation.details.fileSize} • Exported{' '}
                              {new Date(fileValidation.details.exportDate).toLocaleDateString()}
                            </p>
                            <p className="mb-1 text-muted small">
                              {fileValidation.details.totalRecords} records • User: {fileValidation.details.user.email}
                            </p>
                            <p className="mb-0 text-success small">
                              ✓ Valid backup file (v{fileValidation.details.version})
                            </p>
                          </>
                        )}
                        {!fileValidation?.valid && (
                          <p className="mb-0 text-danger small">{fileValidation?.error}</p>
                        )}
                      </div>
                    </div>
                    {!isImporting && (
                      <Button
                        variant="link"
                        size="sm"
                        className="text-danger p-0"
                        onClick={clearSelectedFile}
                      >
                        <FaTimes size={20} />
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Import Progress */}
              {isImporting && importProgress > 0 && (
                <div className="mb-3">
                  <ProgressBar
                    now={importProgress}
                    label={`${importProgress}%`}
                    animated
                    striped
                  />
                  <p className="text-muted small mt-2 mb-0">
                    ⏳ Importing your data... Please do not close this window.
                  </p>
                </div>
              )}

              {/* Import Button */}
              {selectedFile && fileValidation?.valid && !isImporting && (
                <Button
                  variant="success"
                  onClick={handleImport}
                  className="mt-2"
                >
                  <FaUpload className="me-2" />
                  Import Data
                </Button>
              )}
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Best Practices */}
      <Card className="border-primary">
        <Card.Body className="p-4 bg-light">
          <h5 className="mb-3 d-flex align-items-center gap-2">
            <FaInfoCircle color="#2563eb" />
            Backup Best Practices
          </h5>
          <Row>
            <Col md={6}>
              <ul className="text-muted mb-0">
                <li className="mb-2">Export your data regularly (weekly or monthly)</li>
                <li className="mb-2">Store backup files in multiple secure locations</li>
                <li>Test restore functionality periodically</li>
              </ul>
            </Col>
            <Col md={6}>
              <ul className="text-muted mb-0">
                <li className="mb-2">Keep multiple versions of backups</li>
                <li className="mb-2">Never share backup files publicly</li>
                <li>Use encryption for cloud storage</li>
              </ul>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </>
  );
}
