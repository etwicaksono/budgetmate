'use client';

import { useState, useEffect } from 'react';
import { Button, Card, Badge, Spinner, Alert } from 'react-bootstrap';
import { FaGoogle, FaUpload, FaDownload, FaLink, FaUnlink, FaHistory } from 'react-icons/fa';
import Swal from 'sweetalert2';
import { tokenCrypto } from '@/utils/crypto';

interface SyncStatus {
  connected: boolean;
  sheet: {
    id: string;
    url: string;
    name: string;
  } | null;
  lastSync: {
    date: string;
    direction: string;
    mode: string;
    status: string;
  } | null;
}

export function GoogleSheetsSection() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const fetchStatus = async () => {
    try {
      const encryptedToken = localStorage.getItem('finance-app-auth-token');
      if (!encryptedToken) return;
      
      const token = await tokenCrypto.decryptToken(encryptedToken);
      if (!token) return;

      const response = await fetch('/api/v1/sync/status', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStatus(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch sync status:', error);
    }
  };

  useEffect(() => {
    fetchStatus();

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('sync_success')) {
      Swal.fire({
        icon: 'success',
        title: 'Connected!',
        text: 'Google Sheets connected successfully',
        confirmButtonColor: '#28a745',
      });
      window.history.replaceState({}, '', '/settings');
      fetchStatus();
    } else if (urlParams.get('sync_error')) {
      Swal.fire({
        icon: 'error',
        title: 'Connection Failed',
        text: 'Failed to connect Google Sheets',
        confirmButtonColor: '#dc3545',
      });
      window.history.replaceState({}, '', '/settings');
    }
  }, []);

  const handleConnect = async () => {
    setLoading(true);
    try {
      const encryptedToken = localStorage.getItem('finance-app-auth-token');
      if (!encryptedToken) {
        await Swal.fire({
          icon: 'error',
          title: 'Authentication Error',
          text: 'Please login first',
          confirmButtonColor: '#dc3545',
        });
        setLoading(false);
        return;
      }
      
      const token = await tokenCrypto.decryptToken(encryptedToken);
      if (!token) {
        await Swal.fire({
          icon: 'error',
          title: 'Authentication Error',
          text: 'Invalid token. Please login again',
          confirmButtonColor: '#dc3545',
        });
        setLoading(false);
        return;
      }

      const response = await fetch('/api/v1/sync/connect', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        window.location.href = data.data.authUrl;
      } else {
        await Swal.fire({
          icon: 'error',
          title: 'Connection Failed',
          text: 'Failed to initiate Google connection',
          confirmButtonColor: '#dc3545',
        });
      }
    } catch (_error) {
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'An error occurred',
        confirmButtonColor: '#dc3545',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Disconnect Google Sheets?',
      text: 'This will remove the connection but keep your data',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, Disconnect',
    });

    if (!result.isConfirmed) return;

    setLoading(true);
    try {
      const encryptedToken = localStorage.getItem('finance-app-auth-token');
      const token = encryptedToken ? await tokenCrypto.decryptToken(encryptedToken) : null;
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch('/api/v1/sync/disconnect', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await Swal.fire({
          icon: 'success',
          title: 'Disconnected',
          text: 'Google Sheets connection removed',
          confirmButtonColor: '#28a745',
        });
        await fetchStatus();
      } else {
        await Swal.fire({
          icon: 'error',
          title: 'Disconnect Failed',
          text: 'Failed to disconnect',
          confirmButtonColor: '#dc3545',
        });
      }
    } catch (_error) {
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'An error occurred',
        confirmButtonColor: '#dc3545',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePush = async () => {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Push to Google Sheets?',
      text: 'This will replace all data in your Google Sheet',
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, Push',
    });

    if (!result.isConfirmed) return;

    setSyncing(true);
    try {
      const encryptedToken = localStorage.getItem('finance-app-auth-token');
      const token = encryptedToken ? await tokenCrypto.decryptToken(encryptedToken) : null;
      if (!token) {
        setSyncing(false);
        return;
      }

      const response = await fetch('/api/v1/sync/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          mode: 'replace',
          spreadsheetId: status?.sheet?.id // Use existing sheet if available
        }),
      });

      if (response.ok) {
        const data = await response.json();
        await Swal.fire({
          icon: 'success',
          title: 'Push Successful',
          html: `
            <p>Exported data to Google Sheets:</p>
            <ul style="text-align: left; list-style: none; padding: 0;">
              <li>✓ ${data.data.counts.accounts} accounts</li>
              <li>✓ ${data.data.counts.categories} categories</li>
              <li>✓ ${data.data.counts.transactions} transactions</li>
              <li>✓ ${data.data.counts.transfers} transfers</li>
              <li>✓ ${data.data.counts.labels} labels</li>
            </ul>
          `,
          confirmButtonColor: '#28a745',
        });
        await fetchStatus();
      } else {
        await Swal.fire({
          icon: 'error',
          title: 'Push Failed',
          text: 'Failed to export data',
          confirmButtonColor: '#dc3545',
        });
      }
    } catch (_error) {
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'An error occurred',
        confirmButtonColor: '#dc3545',
      });
    } finally {
      setSyncing(false);
    }
  };

  const handlePull = async () => {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Pull from Google Sheets?',
      html: '<p><strong>Warning:</strong> This will replace all your local data!</p><p>Make sure you have a backup.</p>',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, Pull',
    });

    if (!result.isConfirmed) return;

    setSyncing(true);
    try {
      const encryptedToken = localStorage.getItem('finance-app-auth-token');
      const token = encryptedToken ? await tokenCrypto.decryptToken(encryptedToken) : null;
      if (!token) {
        setSyncing(false);
        return;
      }

      const response = await fetch('/api/v1/sync/pull', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ mode: 'replace' }),
      });

      if (response.ok) {
        await response.json();
        await Swal.fire({
          icon: 'success',
          title: 'Pull Successful',
          text: 'Data imported from Google Sheets successfully',
          confirmButtonColor: '#28a745',
        });
        await fetchStatus();
        setTimeout(() => window.location.reload(), 2000);
      } else {
        await Swal.fire({
          icon: 'error',
          title: 'Pull Failed',
          text: 'Failed to import data',
          confirmButtonColor: '#dc3545',
        });
      }
    } catch (_error) {
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'An error occurred',
        confirmButtonColor: '#dc3545',
      });
    } finally {
      setSyncing(false);
    }
  };

  if (!status) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-4">Google Sheets Sync</h2>
      <p className="text-muted mb-4">
        Sync your financial data with Google Sheets for backup and external analysis
      </p>

      <Alert variant="info" className="mb-4">
        <strong>How it works:</strong> Connect your Google account, then push data to Google Sheets or pull data back to the app.
        All data is synced in real-time across 6 sheets (Metadata, Accounts, Categories, Transactions, Transfers, Labels).
      </Alert>

      {!status.connected ? (
        <Card className="mb-4">
          <Card.Body className="p-4">
            <div className="text-center py-3">
              <FaGoogle size={48} color="#4285F4" className="mb-3" />
              <h5 className="mb-3">Connect Google Sheets</h5>
              <p className="text-muted mb-4">
                Authorize access to create and manage spreadsheets with your financial data
              </p>
              <Button
                variant="primary"
                size="lg"
                onClick={handleConnect}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <FaGoogle className="me-2" />
                    Connect Google Account
                  </>
                )}
              </Button>
            </div>
          </Card.Body>
        </Card>
      ) : (
        <>
          <Card className="mb-4">
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div>
                  <h5 className="mb-2">
                    <FaLink className="me-2 text-success" />
                    Connected
                  </h5>
                  {status.sheet && (
                    <div>
                      <p className="mb-1">
                        <strong>Sheet:</strong> {status.sheet.name}
                      </p>
                      <a
                        href={status.sheet.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary"
                      >
                        Open in Google Sheets →
                      </a>
                    </div>
                  )}
                </div>
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={handleDisconnect}
                  disabled={loading}
                >
                  {loading ? (
                    <Spinner animation="border" size="sm" />
                  ) : (
                    <>
                      <FaUnlink className="me-2" />
                      Disconnect
                    </>
                  )}
                </Button>
              </div>

              {status.lastSync && (
                <div className="border-top pt-3 mt-3">
                  <p className="text-muted mb-1">
                    <FaHistory className="me-2" />
                    <strong>Last Sync:</strong> {new Date(status.lastSync.date).toLocaleString()}
                  </p>
                  <Badge bg={status.lastSync.status === 'success' ? 'success' : 'danger'}>
                    {status.lastSync.direction.toUpperCase()} - {status.lastSync.status}
                  </Badge>
                </div>
              )}
            </Card.Body>
          </Card>

          <Card>
            <Card.Body className="p-4">
              <h5 className="mb-3">Sync Actions</h5>
              <div className="d-flex gap-3">
                <Button
                  variant="outline-primary"
                  onClick={handlePush}
                  disabled={syncing}
                >
                  {syncing ? (
                    <Spinner animation="border" size="sm" className="me-2" />
                  ) : (
                    <FaUpload className="me-2" />
                  )}
                  Push to Sheets
                </Button>
                <Button
                  variant="outline-success"
                  onClick={handlePull}
                  disabled={syncing}
                >
                  {syncing ? (
                    <Spinner animation="border" size="sm" className="me-2" />
                  ) : (
                    <FaDownload className="me-2" />
                  )}
                  Pull from Sheets
                </Button>
              </div>
              <p className="text-muted small mt-3 mb-0">
                <strong>Push:</strong> Export your local data to Google Sheets<br />
                <strong>Pull:</strong> Import data from Google Sheets (replaces local data)
              </p>
            </Card.Body>
          </Card>
        </>
      )}
    </div>
  );
}
