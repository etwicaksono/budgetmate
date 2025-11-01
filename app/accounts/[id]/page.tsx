'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import AccountDetail from '../../../src/views/Accounts/AccountDetail';
import { accountService } from '../../../src/services/accountService';
import ProtectedShell from '../../components/ProtectedShell';
import { mapApiAccountToAccount, type Account } from '../../../src/utils/accountUtils';

export default function AccountDetailPage(): JSX.Element {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const accountId = params.id as string;
  const from = searchParams.get('from') || 'accounts';

  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAccount = async () => {
      try {
        setLoading(true);
        const foundAccount = await accountService.fetchAccountById(accountId);

        if (foundAccount) {
          const mappedAccount = mapApiAccountToAccount(foundAccount, 0);
          setAccount(mappedAccount);
        } else {
          setError('Account not found');
        }
      } catch (err) {
        console.error('Failed to fetch account:', err);
        setError('Failed to load account details');
      } finally {
        setLoading(false);
      }
    };

    if (accountId) {
      void fetchAccount();
    }
  }, [accountId]);

  const handleBack = (): void => {
    if (from === 'dashboard') {
      router.push('/');
    } else {
      router.push('/accounts');
    }
  };

  const handleEdit = (editedAccount: Account): void => {
    // TODO: Implement edit functionality with API call
    // For now, just go back to the list
    router.push('/accounts');
  };

  const handleDelete = (deletedAccountId: string): void => {
    // TODO: Implement delete functionality with API call
    if (from === 'dashboard') {
      router.push('/');
    } else {
      router.push('/accounts');
    }
  };

  if (loading) {
    return (
      <ProtectedShell>
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <p>Loading account details...</p>
        </div>
      </ProtectedShell>
    );
  }

  if (error || !account) {
    return (
      <ProtectedShell>
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <p>{error || 'Account not found'}</p>
          <button
            onClick={handleBack}
            style={{
              padding: '0.5rem 1rem',
              marginTop: '1rem',
              cursor: 'pointer',
            }}
          >
            Back to Accounts
          </button>
        </div>
      </ProtectedShell>
    );
  }

  return (
    <ProtectedShell>
      <AccountDetail
        account={account}
        onBack={handleBack}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </ProtectedShell>
  );
}
