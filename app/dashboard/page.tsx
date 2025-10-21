'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@/components/Alert';
import Dialog from '@/components/Dialog';
import Image from 'next/image';
import ThemeToggle from '@/components/ThemeToggle';
import UserTable from '@/components/UserTable';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import PieChartCard from '@/components/dashboard/PieChartCard';
import ProgressBarCard from '@/components/dashboard/ProgressBarCard';

const API_URL = 'http://localhost:8000';

interface User {
  username: string;
  role: string;
  is_admin?: boolean;
}

interface UserStats {
  username: string;
  proposals: number;
  interviews: number;
  hire: number;
  proposalsTime?: string;
  interviewsTime?: string;
  hireTime?: string;
}

interface Job {
  _id: string;
  title: string;
  description: string;
  skills: string[];
  postedDate: string;
  proposalsCount: number;
  interviewsCount: number;
  hireCount: number;
  url: string;
}

export default function DashboardPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'users' | 'bidInsight' | 'jobs'>('users');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [windowWidth, setWindowWidth] = useState(0);
  
  // Get username from session storage
  const username = JSON.parse(sessionStorage.getItem('user') || '{}').username || 'Admin';
  const [period, setPeriod] = useState<'today' | 'yesterday' | 'week' | 'month' | 'custom'>('today');
  const [customDate, setCustomDate] = useState('');
  const [allStats, setAllStats] = useState<UserStats[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [rankBy, setRankBy] = useState<'user' | 'count'>('user');
  
  // Jobs state
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'proposals' | 'interviews' | 'postedDate' | 'hire'>('postedDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());
  
  const router = useRouter();

  useEffect(() => {
    // Check if user is admin
    const user = sessionStorage.getItem('user');
    const isAdmin = sessionStorage.getItem('isAdmin');
    
    console.log('Admin dashboard - user data:', user);
    console.log('Admin dashboard - isAdmin:', isAdmin);
    
    if (!user || isAdmin !== 'true') {
      console.log('Not admin or no user data, redirecting to login');
      router.push('/');
      return;
    }
    
    console.log('Admin verified, loading users');
    fetchUsers();
  }, [router]);

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_URL}/get-all-users`);
      const data = await response.json();
      console.log('Raw data from API:', data);
      
      const mappedUsers = data.map((user: { username: string; role: string; is_admin?: boolean }) => ({
        username: user.username,
        role: user.role || 'user',
        is_admin: user.is_admin || false
      }));
      
      console.log('Mapped users:', mappedUsers);
      setUsers(mappedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      setAlert({ message: 'Failed to fetch users', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (username: string, password: string) => {
    try {
      const response = await fetch(`${API_URL}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        setAlert({ message: 'User created successfully!', type: 'success' });
        fetchUsers();
        setShowCreateDialog(false);
      } else {
        const data = await response.json();
        setAlert({ message: data.detail || 'Failed to create user', type: 'error' });
      }
    } catch (error) {
      setAlert({ message: 'Connection error', type: 'error' });
    }
  };

  const handleResetPassword = async (newPassword: string) => {
    if (!selectedUser) return;

    try {
      const response = await fetch(`${API_URL}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: selectedUser, new_password: newPassword }),
      });

      if (response.ok) {
        setAlert({ message: 'Password reset successfully!', type: 'success' });
        setShowResetDialog(false);
        setSelectedUser(null);
      } else {
        setAlert({ message: 'Failed to reset password', type: 'error' });
      }
    } catch (error) {
      setAlert({ message: 'Connection error', type: 'error' });
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      const response = await fetch(`${API_URL}/delete-user/${selectedUser}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setAlert({ message: 'User deleted successfully!', type: 'success' });
        fetchUsers();
        setShowDeleteDialog(false);
        setSelectedUser(null);
      } else {
        const data = await response.json();
        setAlert({ message: data.detail || 'Failed to delete user', type: 'error' });
      }
    } catch (error) {
      setAlert({ message: 'Connection error', type: 'error' });
    }
  };

  const handleLogout = () => {
    sessionStorage.clear();
    router.push('/');
  };

  // Dashboard functions

  // Bid insight functions
  const loadStats = async () => {
    setLoadingStats(true);
    try {
      let endpoint = '';
      let method = 'GET';
      let body = null;
      
      switch (period) {
        case 'today':
          endpoint = '/get_all_daily_count';
          break;
        case 'yesterday':
          endpoint = '/get_all_yesterday_count';
          break;
        case 'week':
          endpoint = '/get_all_weekly_count';
          break;
        case 'month':
          endpoint = '/get_all_monthly_count';
          break;
        case 'custom':
          endpoint = `/get_all_day_count?date=${customDate}`;
          break;
      }

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: body,
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Admin dashboard - loaded stats:', data);
        setAllStats(data);
      } else {
        console.error('Failed to load stats:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const loadJobs = async () => {
    setLoadingJobs(true);
    try {
      let url = `${API_URL}/jobs`;
      const params = new URLSearchParams();
      
      if (period) {
        params.append('period', period);
      }
      if (period === 'custom' && customDate) {
        params.append('date', customDate);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        console.log('Jobs data received:', data);
        
        // Debug: Log the first job's date format
        if (data.length > 0) {
          console.log('First job postedDate:', data[0].postedDate, 'Type:', typeof data[0].postedDate);
        }
        
        setJobs(data);
      } else {
        console.error('Failed to load jobs');
      }
    } catch (error) {
      console.error('Error loading jobs:', error);
    } finally {
      setLoadingJobs(false);
    }
  };

  const sortedJobs = [...jobs].sort((a, b) => {
    let aValue: any, bValue: any;
    
    switch (sortBy) {
      case 'proposals':
        aValue = a.proposalsCount;
        bValue = b.proposalsCount;
        break;
      case 'interviews':
        aValue = a.interviewsCount;
        bValue = b.interviewsCount;
        break;
      case 'hire':
        aValue = a.hireCount;
        bValue = b.hireCount;
        break;
      case 'postedDate':
        aValue = new Date(a.postedDate);
        bValue = new Date(b.postedDate);
        break;
      default:
        return 0;
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
    } else {
      return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
    }
  });

  const jobsPerPage = 20;
  const totalPages = Math.ceil(sortedJobs.length / jobsPerPage);
  const startIndex = (currentPage - 1) * jobsPerPage;
  const paginatedJobs = sortedJobs.slice(startIndex, startIndex + jobsPerPage);

  const formatTimeAgo = (dateString: string) => {
    if (!dateString) return 'Unknown date';
    
    // If it's already a relative date string like "3 days ago", return as is
    if (dateString.includes('ago') || dateString.includes('day') || dateString.includes('hour') || dateString.includes('minute') || dateString.includes('second') || dateString.includes('week') || dateString.includes('month') || dateString.includes('year')) {
      return dateString;
    }
    
    const now = new Date();
    let date: Date;
    
    try {
      // Handle different date formats
      if (dateString.includes('T') || dateString.includes('Z')) {
        // ISO format date
        date = new Date(dateString);
      } else if (dateString.includes('-')) {
        // YYYY-MM-DD format
        date = new Date(dateString + 'T00:00:00');
      } else {
        // Try to parse as is
        date = new Date(dateString);
      }
      
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        console.log('Invalid date string:', dateString);
        return 'Invalid date';
      }
      
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
      
      if (diffInSeconds < 0) return 'Future date';
      if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
      if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
      return `${Math.floor(diffInSeconds / 2592000)} months ago`;
    } catch (error) {
      console.log('Date parsing error:', error, 'for date:', dateString);
      return 'Invalid date';
    }
  };

  const toggleDescription = (jobId: string) => {
    const newExpanded = new Set(expandedDescriptions);
    if (newExpanded.has(jobId)) {
      newExpanded.delete(jobId);
    } else {
      newExpanded.add(jobId);
    }
    setExpandedDescriptions(newExpanded);
  };

  const truncateUrl = (url: string, maxLength: number = 30) => {
    if (url.length <= maxLength) return url;
    
    // Remove protocol for cleaner display
    const cleanUrl = url.replace(/^https?:\/\//, '');
    
    if (cleanUrl.length <= maxLength) return cleanUrl;
    
    // Truncate and add ellipsis
    return cleanUrl.substring(0, maxLength - 3) + '...';
  };

  const openUrlInNewTab = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const calculateRanks = (stats: UserStats[], field: 'proposals' | 'interviews' | 'hire') => {
    return [...stats].sort((a, b) => {
      const aValue = a[field];
      const bValue = b[field];
      
      if (aValue !== bValue) {
        return bValue - aValue; // Higher values first
      }
      
      // If values are equal, sort by time (earlier time = higher rank)
      const aTime = a[`${field}Time` as keyof UserStats] as string;
      const bTime = b[`${field}Time` as keyof UserStats] as string;
      
      if (aTime && bTime) {
        return new Date(aTime).getTime() - new Date(bTime).getTime();
      }
      
      return 0;
    });
  };

  const getRankColor = (rank: number, total: number) => {
    if (total === 1) return '#10b981'; // Green for single user
    if (rank === 1) return '#10b981'; // Green for 1st place
    if (rank === 2) return '#f59e0b'; // Amber for 2nd place
    if (rank === 3) return '#ef4444'; // Red for 3rd place
    return '#6b7280'; // Gray for other ranks
  };

  const getOrdinalSuffix = (num: number) => {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return num + 'st';
    if (j === 2 && k !== 12) return num + 'nd';
    if (j === 3 && k !== 13) return num + 'rd';
    return num + 'th';
  };

  useEffect(() => {
    if (activeTab === 'bidInsight') {
      // Set default custom date to day before yesterday
      const dayBeforeYesterday = new Date();
      dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);
      setCustomDate(dayBeforeYesterday.toISOString().split('T')[0]);
      loadStats();
    } else if (activeTab === 'jobs') {
      loadJobs();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'bidInsight') {
      loadStats();
    } else if (activeTab === 'jobs') {
      loadJobs();
    }
  }, [period, customDate]);

  // Handle window resize for automatic sidebar collapse
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      // Auto-collapse when window is too narrow (less than lg breakpoint: 1024px)
      if (window.innerWidth < 1024) {
        setSidebarCollapsed(true);
      } else {
        setSidebarCollapsed(false);
      }
    };

    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Sidebar */}
      <div className={`${sidebarCollapsed ? 'w-12' : 'w-80'} bg-blue-100 dark:bg-blue-900/20 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300`}>
        <div className={`${sidebarCollapsed ? 'p-2' : 'p-6'} flex-1 flex flex-col`}>
          {/* Logo and Toggle Button */}
          {!sidebarCollapsed && (
            <div className="mb-8 flex items-center justify-between">
              <Image 
                src="/tokbyte.png" 
                alt="Upwork Tracker Logo" 
                width={144} 
                height={144}
                className="mx-auto"
              />
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          )}
          
          {/* Toggle button when collapsed */}
          {sidebarCollapsed && (
            <div className="mb-4 flex justify-center">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          )}
          
          {/* Navigation */}
          <nav className={`${sidebarCollapsed ? 'space-y-1' : 'space-y-2'} flex-1`}>
            <button
              onClick={() => setActiveTab('users')}
              className={`w-full ${sidebarCollapsed ? 'flex justify-center px-1 py-2' : 'text-left px-4 py-3'} rounded-lg font-medium transition-colors flex items-center ${
                activeTab === 'users'
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <svg className={`${sidebarCollapsed ? 'w-4 h-4' : 'w-5 h-5'} flex-shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              {!sidebarCollapsed && <span className="ml-3">Users List</span>}
            </button>
            <button
              onClick={() => setActiveTab('bidInsight')}
              className={`w-full ${sidebarCollapsed ? 'flex justify-center px-1 py-2' : 'text-left px-4 py-3'} rounded-lg font-medium transition-colors flex items-center ${
                activeTab === 'bidInsight'
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <svg className={`${sidebarCollapsed ? 'w-4 h-4' : 'w-5 h-5'} flex-shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              {!sidebarCollapsed && <span className="ml-3">Bid Insight</span>}
            </button>
            <button
              onClick={() => setActiveTab('jobs')}
              className={`w-full ${sidebarCollapsed ? 'flex justify-center px-1 py-2' : 'text-left px-4 py-3'} rounded-lg font-medium transition-colors flex items-center ${
                activeTab === 'jobs'
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <svg className={`${sidebarCollapsed ? 'w-4 h-4' : 'w-5 h-5'} flex-shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2V6" />
              </svg>
              {!sidebarCollapsed && <span className="ml-3">Jobs</span>}
            </button>
          </nav>

          {/* Logout button at bottom */}
          <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleLogout}
              className={`w-full ${sidebarCollapsed ? 'flex justify-center px-1 py-2' : 'px-4 py-2'} bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg font-medium transition-colors flex items-center justify-center mb-4`}
            >
              <svg className={`${sidebarCollapsed ? 'w-4 h-4' : 'w-5 h-5'} flex-shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {!sidebarCollapsed && <span className="ml-2">Logout</span>}
            </button>
          </div>
        </div>
      </div>

        {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 h-24">
          <div className="h-full px-6 flex justify-between items-center">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Panel</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">
                Welcome, <span className="font-bold text-green-600 dark:text-green-400 text-base sm:text-lg">{username}</span>
              </span>
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          <div className="max-w-6xl mx-auto">
            {activeTab === 'users' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Users List</h2>
                  <button
                    onClick={() => setShowCreateDialog(true)}
                    className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition font-medium"
                  >
                    + Add User
                  </button>
                </div>

                <UserTable
                  users={users}
                  onResetPassword={(username) => {
                    setSelectedUser(username);
                    setShowResetDialog(true);
                  }}
                  onDeleteUser={(username) => {
                    setSelectedUser(username);
                    setShowDeleteDialog(true);
                  }}
                />
              </div>
            )}

            {activeTab === 'bidInsight' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">Bid Insight</h2>
                
                {/* Period Selection */}
                <div className="mb-6">
                  <div className="flex flex-wrap gap-4 items-center">
                    <select
                      value={period}
                      onChange={(e) => setPeriod(e.target.value as any)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="today">Today</option>
                      <option value="yesterday">Yesterday</option>
                      <option value="week">This Week</option>
                      <option value="month">This Month</option>
                      <option value="custom">Custom Day</option>
                    </select>

                    <select
                      value={rankBy}
                      onChange={(e) => setRankBy(e.target.value as any)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="user">Rank by User</option>
                      <option value="count">Rank by Count</option>
                    </select>

                    {period === 'custom' && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const currentDate = new Date(customDate);
                            currentDate.setDate(currentDate.getDate() - 1);
                            setCustomDate(currentDate.toISOString().split('T')[0]);
                          }}
                          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          title="Previous day"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <input
                          type="date"
                          value={customDate}
                          onChange={(e) => setCustomDate(e.target.value)}
                          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const currentDate = new Date(customDate);
                            currentDate.setDate(currentDate.getDate() + 1);
                            setCustomDate(currentDate.toISOString().split('T')[0]);
                          }}
                          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          title="Next day"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Team Performance */}
                {loadingStats ? (
                  <div className="text-center py-8">
                    <div className="text-gray-600">Loading statistics...</div>
                  </div>
                ) : allStats.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-600">No data available for the selected period.</div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">Team Performance</h3>
                      
                      {rankBy === 'user' ? (
                        /* Rank by User Table */
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-gray-200 dark:border-gray-700">
                                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">
                                  Rank
                                </th>
                                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">
                                  User
                                </th>
                                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">
                                  Proposals
                                </th>
                                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">
                                  Interviews
                                </th>
                                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">
                                  Hires
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {allStats.map((user, index) => {
                                const proposalsRank = calculateRanks(allStats, 'proposals').findIndex(u => u.username === user.username) + 1;
                                const interviewsRank = calculateRanks(allStats, 'interviews').findIndex(u => u.username === user.username) + 1;
                                const hireRank = calculateRanks(allStats, 'hire').findIndex(u => u.username === user.username) + 1;
                                
                                const proposalsColor = getRankColor(proposalsRank, allStats.length);
                                const interviewsColor = getRankColor(interviewsRank, allStats.length);
                                const hireColor = getRankColor(hireRank, allStats.length);
                                
                                return (
                                  <tr key={user.username} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                                    <td className="py-4 px-6 text-gray-800 dark:text-gray-200">
                                      {index + 1}
                                    </td>
                                    <td className="py-4 px-6 text-gray-800 dark:text-gray-200">
                                      {user.username}
                                    </td>
                                    <td className="py-4 px-6">
                                      <div className="flex items-center">
                                        <span style={{ color: proposalsColor }} className="font-medium">
                                          {user.proposals}
                                        </span>
                                        <span style={{ color: proposalsColor }} className="ml-2 text-xs">
                                          {getOrdinalSuffix(proposalsRank)}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="py-4 px-6">
                                      <div className="flex items-center">
                                        <span style={{ color: interviewsColor }} className="font-medium">
                                          {user.interviews}
                                        </span>
                                        <span style={{ color: interviewsColor }} className="ml-2 text-xs">
                                          {getOrdinalSuffix(interviewsRank)}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="py-4 px-6">
                                      <div className="flex items-center">
                                        <span style={{ color: hireColor }} className="font-medium">
                                          {user.hire}
                                        </span>
                                        <span style={{ color: hireColor }} className="ml-2 text-xs">
                                          {getOrdinalSuffix(hireRank)}
                                        </span>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        /* Rank by Count Table */
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-gray-200 dark:border-gray-700">
                                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">
                                  Rank
                                </th>
                                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">
                                  Proposals
                                </th>
                                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">
                                  Interviews
                                </th>
                                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">
                                  Hires
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {Array.from({ length: allStats.length }, (_, rankIndex) => {
                                const rank = rankIndex + 1;
                                const proposalsRanked = calculateRanks(allStats, 'proposals');
                                const interviewsRanked = calculateRanks(allStats, 'interviews');
                                const hireRanked = calculateRanks(allStats, 'hire');
                                
                                const proposalsUser = proposalsRanked[rankIndex] || { username: '-', proposals: 0 };
                                const interviewsUser = interviewsRanked[rankIndex] || { username: '-', interviews: 0 };
                                const hireUser = hireRanked[rankIndex] || { username: '-', hire: 0 };
                                
                                const proposalsColor = getRankColor(rank, allStats.length);
                                const interviewsColor = getRankColor(rank, allStats.length);
                                const hireColor = getRankColor(rank, allStats.length);
                                
                                return (
                                  <tr key={rankIndex} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                                    <td className="py-4 px-6 text-gray-800 dark:text-gray-200">
                                      {getOrdinalSuffix(rank)}
                                    </td>
                                    <td className="py-4 px-6">
                                      <div className="flex items-center">
                                        <span style={{ color: proposalsColor }} className="font-medium">
                                          {proposalsUser.username}: {proposalsUser.proposals}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="py-4 px-6">
                                      <div className="flex items-center">
                                        <span style={{ color: interviewsColor }} className="font-medium">
                                          {interviewsUser.username}: {interviewsUser.interviews}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="py-4 px-6">
                                      <div className="flex items-center">
                                        <span style={{ color: hireColor }} className="font-medium">
                                          {hireUser.username}: {hireUser.hire}
                                        </span>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* My Performance Section */}
                    <div className="mt-8">
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">My Performance</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-blue-100 text-sm font-medium">Total Proposals</p>
                              <p className="text-3xl font-bold">
                                {allStats.reduce((sum, user) => sum + user.proposals, 0)}
                              </p>
                            </div>
                            <div className="bg-blue-400 rounded-full p-3">
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                          </div>
                        </div>

                        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-green-100 text-sm font-medium">Total Interviews</p>
                              <p className="text-3xl font-bold">
                                {allStats.reduce((sum, user) => sum + user.interviews, 0)}
                              </p>
                            </div>
                            <div className="bg-green-400 rounded-full p-3">
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          </div>
                        </div>

                        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-purple-100 text-sm font-medium">Total Hires</p>
                              <p className="text-3xl font-bold">
                                {allStats.reduce((sum, user) => sum + user.hire, 0)}
                              </p>
                            </div>
                            <div className="bg-purple-400 rounded-full p-3">
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Jobs Tab Content */}
            {activeTab === 'jobs' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">Jobs</h2>
                
                {/* Controls */}
                <div className="mb-6 flex justify-between items-center">
                  {/* Left side - Time Period */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">Period:</label>
                    <select
                      value={period}
                      onChange={(e) => setPeriod(e.target.value as any)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="today">Today</option>
                      <option value="yesterday">Yesterday</option>
                      <option value="week">This Week</option>
                      <option value="month">This Month</option>
                      <option value="custom">Custom Day</option>
                    </select>
                    {period === 'custom' && (
                      <input
                        type="date"
                        value={customDate}
                        onChange={(e) => setCustomDate(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    )}
                  </div>

                  {/* Right side - Sort Controls */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-700">Sort by:</label>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="postedDate">Posted Date</option>
                        <option value="proposals">Proposals</option>
                        <option value="interviews">Interviews</option>
                        <option value="hire">Hires</option>
                      </select>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-700">Order:</label>
                      <select
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value as any)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="desc">Descending</option>
                        <option value="asc">Ascending</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Jobs Table */}
                {loadingJobs ? (
                  <div className="text-center py-8">
                    <div className="text-gray-600">Loading jobs...</div>
                  </div>
                ) : paginatedJobs.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-600">No jobs available.</div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300 w-48">
                            Title
                          </th>
                          <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300 w-64">
                            Description
                          </th>
                          <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300 w-32">
                            Skills
                          </th>
                          <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300 w-40">
                            URL
                          </th>
                          <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300 w-24">
                            Posted Date
                          </th>
                          <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300 w-20">
                            Proposals
                          </th>
                          <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300 w-20">
                            Interviews
                          </th>
                          <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300 w-20">
                            Hires
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedJobs.map((job) => (
                          <tr key={job._id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                            <td className="py-4 px-6">
                              <div className="text-sm font-medium text-gray-800 dark:text-gray-200" style={{
                                display: '-webkit-box',
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                lineHeight: '1.4',
                                maxHeight: '4.2em'
                              }}>
                                {job.title}
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="text-sm text-gray-800 dark:text-gray-200">
                                {expandedDescriptions.has(job._id) ? (
                                  <div>
                                    {job.description}
                                    <button
                                      onClick={() => toggleDescription(job._id)}
                                      className="ml-2 text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 text-xs"
                                    >
                                      Show less
                                    </button>
                                  </div>
                                ) : (
                                  <div>
                                    <div style={{
                                      display: '-webkit-box',
                                      WebkitLineClamp: 4,
                                      WebkitBoxOrient: 'vertical',
                                      overflow: 'hidden',
                                      lineHeight: '1.4',
                                      maxHeight: '5.6em'
                                    }}>
                                      {job.description}
                                    </div>
                                    {job.description.length > 100 && (
                                      <button
                                        onClick={() => toggleDescription(job._id)}
                                        className="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 text-xs mt-1"
                                      >
                                        Show more
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex flex-wrap gap-1">
                                {job.skills.slice(0, 2).map((skill, index) => (
                                  <span
                                    key={index}
                                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
                                  >
                                    {skill}
                                  </span>
                                ))}
                                {job.skills.length > 2 && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                                    +{job.skills.length - 2}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <button
                                onClick={() => openUrlInNewTab(job.url)}
                                className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 hover:underline truncate w-full"
                                title={job.url}
                              >
                                {truncateUrl(job.url, 25)}
                              </button>
                            </td>
                            <td className="py-4 px-6 text-gray-800 dark:text-gray-200">
                              {formatTimeAgo(job.postedDate)}
                            </td>
                            <td className="py-4 px-6 text-gray-800 dark:text-gray-200 text-center">
                              {job.proposalsCount || 0}
                            </td>
                            <td className="py-4 px-6 text-gray-800 dark:text-gray-200 text-center">
                              {job.interviewsCount || 0}
                            </td>
                            <td className="py-4 px-6 text-gray-800 dark:text-gray-200 text-center">
                              {job.hireCount || 0}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Showing {startIndex + 1} to {Math.min(startIndex + jobsPerPage, sortedJobs.length)} of {sortedJobs.length} jobs
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-2 text-sm font-medium text-gray-500 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <span className="px-3 py-2 text-sm font-medium text-gray-700">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 text-sm font-medium text-gray-500 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </main>
      </div>

      {/* Dialogs */}
      {showCreateDialog && (
        <Dialog
          title="Create New User"
          onClose={() => setShowCreateDialog(false)}
          onSubmit={(username, password) => handleCreateUser(username!, password!)}
          type="create"
        />
      )}

      {showResetDialog && (
        <Dialog
          title="Reset Password"
          onClose={() => {
            setShowResetDialog(false);
            setSelectedUser(null);
          }}
          onSubmit={(_, password) => handleResetPassword(password!)}
          type="reset"
          username={selectedUser || ''}
        />
      )}

      {showDeleteDialog && (
        <Dialog
          title="Delete User"
          onClose={() => {
            setShowDeleteDialog(false);
            setSelectedUser(null);
          }}
          onSubmit={() => handleDeleteUser()}
          type="delete"
          username={selectedUser || ''}
        />
      )}

      {/* Alert */}
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

