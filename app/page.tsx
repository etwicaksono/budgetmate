'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function Home(): React.ReactElement {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-b from-slate-50 to-white">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">BudgetMate</h1>
        <p className="text-xl text-gray-600 mb-2">
          Smart Finance, Simplified
        </p>
        <p className="text-base text-gray-500 mb-8">
          Take control of your personal finances with smart budgeting, expense tracking, and analytics.
        </p>
        
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="text-white px-8 py-3 rounded-lg text-lg font-semibold transition-colors"
            style={{ backgroundColor: '#1E3A5F' }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#2B5A8E')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#1E3A5F')}
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="bg-white hover:bg-gray-50 px-8 py-3 rounded-lg text-lg font-semibold transition-colors border-2"
            style={{ color: '#1E3A5F', borderColor: '#1E3A5F' }}
          >
            Create Account
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-lg font-semibold mb-2">Track Expenses</h3>
            <p className="text-gray-600 text-sm">
              Monitor your spending with detailed transaction tracking
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-4xl mb-4">💰</div>
            <h3 className="text-lg font-semibold mb-2">Manage Accounts</h3>
            <p className="text-gray-600 text-sm">
              Keep all your accounts in one place
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-4xl mb-4">📈</div>
            <h3 className="text-lg font-semibold mb-2">Analytics</h3>
            <p className="text-gray-600 text-sm">
              Get insights into your financial habits
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
