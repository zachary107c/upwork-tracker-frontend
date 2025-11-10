'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@/components/Alert';

const API_URL = 'http://174.138.178.245:8000';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAlert(null); // Clear any previous alerts

    try {
      const response = await fetch(`${API_URL}/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Debug logging
        console.log('Login response data:', data);
        console.log('User role:', data.role);
        console.log('Is admin?', data.role === 'admin');
        const displayName = data.display_name || username;
        const isWorking = data.is_working ?? true;
        
        // Store user credentials in sessionStorage
        sessionStorage.setItem('user', JSON.stringify({
          ...data,
          username,
          display_name: displayName,
          is_working: isWorking,
        }));
        sessionStorage.setItem('username', username);
        sessionStorage.setItem('displayName', displayName);
        sessionStorage.setItem('isWorking', isWorking ? 'true' : 'false');
        sessionStorage.setItem('isAdmin', data.role === 'admin' ? 'true' : 'false');
        
        // Keep loading state until navigation completes
        if (data.role === 'admin') {
          console.log('Redirecting to admin dashboard');
          router.push('/dashboard');
        } else {
          console.log('Redirecting to user dashboard');
          router.push('/user-dashboard');
        }
        // Don't set loading to false here - let it stay until page navigation
      } else {
        setLoading(false);
        setAlert({ message: data.detail || 'Login failed', type: 'error' });
      }
    } catch (error) {
      setLoading(false);
      setAlert({ message: 'Connection error. Please check if backend is running.', type: 'error' });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-800 via-blue-900 to-indigo-900 p-4">
      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-2xl w-full max-w-md relative border border-gray-200">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Upwork Tracker</h1>
          <p className="text-gray-600 text-sm">Sign in to access your dashboard</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition bg-white text-gray-900 placeholder-gray-500"
              placeholder="Enter your username"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition bg-white text-gray-900 placeholder-gray-500"
              placeholder="Enter your password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center"
          >
            {loading && (
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>

      {alert && (
        <Alert
          message={alert.message}
          type={alert.type}
          onClose={() => setAlert(null)}
        />
      )}
    </div>
  );
}

