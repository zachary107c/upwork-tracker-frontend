'use client';

import { useEffect, useState } from 'react';

type DialogType = 'create' | 'reset' | 'delete' | 'edit';

interface DialogSubmitPayload {
  username?: string;
  password?: string;
  displayName?: string;
}

interface DialogProps {
  title: string;
  onClose: () => void;
  onSubmit: (payload?: DialogSubmitPayload) => void;
  type: DialogType;
  username?: string;
  displayName?: string;
}

export default function Dialog({ title, onClose, onSubmit, type, username, displayName }: DialogProps) {
  const [formData, setFormData] = useState({
    username: '',
    displayName: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (type === 'create') {
      setFormData(prev => ({ ...prev, username: '', displayName: '' }));
    }
  }, [type]);

  useEffect(() => {
    if ((type === 'reset' || type === 'edit') && username) {
      setFormData(prev => ({
        ...prev,
        username,
        displayName: type === 'edit' ? (displayName ?? username) : prev.displayName,
        password: '',
        confirmPassword: '',
      }));
    }
  }, [type, username, displayName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (type === 'delete') {
      onSubmit({ username });
      return;
    }

    if (type === 'create') {
      if (!formData.username.trim()) {
        setError('Username is required');
        return;
      }
      if (!formData.displayName.trim()) {
        setError('Display name is required');
        return;
      }
    }

    if (type === 'create' || type === 'reset') {
      if (!formData.password) {
        setError('Password is required');
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      if (formData.password.length < 4) {
        setError('Password must be at least 4 characters');
        return;
      }
    }

    if (type === 'edit' && !formData.displayName.trim()) {
      setError('Display name is required');
      return;
    }

    onSubmit({
      username: type === 'create' ? formData.username.trim() : username,
      password: type === 'create' || type === 'reset' ? formData.password : undefined,
      displayName: type === 'create' || type === 'edit' ? formData.displayName.trim() : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6 m-4 animate-fade-in">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {type === 'delete' ? (
          <div>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to delete user <strong>{username}</strong>?
              <br />
              This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-red-500 dark:bg-red-600 text-white rounded-lg hover:bg-red-600 dark:hover:bg-red-700 transition"
              >
                Delete
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 mb-6">
              {type === 'create' && (
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    placeholder="Enter username"
                    required
                  />
                </div>
              )}

              {(type === 'reset' || type === 'edit') && (
                <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="text-sm text-gray-600 dark:text-gray-300">User: </span>
                  <span className="text-sm font-semibold text-gray-800 dark:text-white">{username}</span>
                </div>
              )}

              {(type === 'create' || type === 'edit') && (
                <div>
                  <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Display Name
                  </label>
                  <input
                    type="text"
                    id="displayName"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    placeholder="Enter display name"
                    required
                  />
                </div>
              )}

              {(type === 'create' || type === 'reset') && (
                <>
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {type === 'reset' ? 'New Password' : 'Password'}
                    </label>
                    <input
                      type="password"
                      id="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                      placeholder="Enter password"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      id="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                      placeholder="Confirm password"
                      required
                    />
                  </div>
                </>
              )}

              {error && (
                <div className="text-red-500 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                  {error}
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition"
              >
                {type === 'reset' ? 'Reset' : type === 'edit' ? 'Save' : 'Create'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

