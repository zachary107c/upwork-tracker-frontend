'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@/components/Alert';
import Dialog from '@/components/Dialog';
import Image from 'next/image';
import ThemeToggle from '@/components/ThemeToggle';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import PieChartCard from '@/components/dashboard/PieChartCard';
import ProgressBarCard from '@/components/dashboard/ProgressBarCard';

const API_URL = 'http://174.138.178.245:8000';

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
  users?: Array<{
    userId: string;
    submitted: { count: number; date?: string };
    interview: { count: number; date?: string };
    hire: { count: number; date?: string };
  }>;
}

interface Source {
  _id: string;
  title: string;
  description: string;
  fileName: string;
  filePath: string;
  uploadedAt: string;
  uploadedBy: string;
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
  const [activeTab, setActiveTab] = useState<'bidInsight' | 'jobs' | 'sources' | 'users'>('bidInsight');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [windowWidth, setWindowWidth] = useState(0);
  
  // Get username from session storage
  const username = JSON.parse(sessionStorage.getItem('user') || '{}').username || 'Admin';
  const [period, setPeriod] = useState<'today' | 'yesterday' | 'week' | 'month' | 'lastWeek' | 'lastMonth' | 'custom'>('today');
  const [customDate, setCustomDate] = useState('');
  const [allStats, setAllStats] = useState<UserStats[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [rankBy, setRankBy] = useState<'user' | 'count'>('count');
  
  // Jobs state
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'proposals' | 'interviews' | 'postedDate' | 'hire'>('postedDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());
  const [filteredUser, setFilteredUser] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  
  // Sources state
  const [sources, setSources] = useState<Source[]>([]);
  const [loadingSources, setLoadingSources] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showDeleteSourceDialog, setShowDeleteSourceDialog] = useState(false);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [deletingSource, setDeletingSource] = useState(false);
  
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

  const handleRemoveUser = (username: string) => {
    setSelectedUser(username);
    setShowDeleteDialog(true);
  };

  // Get user names for job statistics
  const getUserNamesForJob = (job: Job, type: 'submitted' | 'interview' | 'hire') => {
    if (!job.users || job.users.length === 0) return [];
    
    return job.users
      .filter(user => user[type] && user[type].count > 0)
      .map(user => `${user.userId}: ${user[type].count}`)
      .join(', ');
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
        case 'lastWeek':
          endpoint = '/get_all_last_week_count';
          break;
        case 'lastMonth':
          endpoint = '/get_all_last_month_count';
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

  // Sources functions
  const loadSources = async () => {
    setLoadingSources(true);
    try {
      const response = await fetch(`${API_URL}/sources`);
      if (response.ok) {
        const data = await response.json();
        setSources(data);
      } else {
        console.error('Failed to load sources');
      }
    } catch (error) {
      console.error('Error loading sources:', error);
    } finally {
      setLoadingSources(false);
    }
  };

  const handleFileUpload = async () => {
    if (!uploadTitle || !uploadDescription || !uploadFile) {
      setAlert({ message: 'Please fill all fields', type: 'error' });
      return;
    }

    const formData = new FormData();
    formData.append('title', uploadTitle);
    formData.append('description', uploadDescription);
    formData.append('file', uploadFile);
    formData.append('uploadedBy', username);

    setUploading(true);
    setUploadProgress(0);

    try {
      // Simulate progress for demonstration
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 100);

      const response = await fetch(`${API_URL}/sources/upload`, {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.ok) {
        setAlert({ message: 'Source uploaded successfully', type: 'success' });
        setTimeout(() => {
          setShowUploadDialog(false);
          setUploadTitle('');
          setUploadDescription('');
          setUploadFile(null);
          setUploading(false);
          setUploadProgress(0);
        }, 500);
        await loadSources();
      } else {
        const errorData = await response.json();
        setAlert({ message: errorData.detail || 'Failed to upload source', type: 'error' });
        setUploading(false);
        setUploadProgress(0);
      }
    } catch (error) {
      console.error('Error uploading source:', error);
      setAlert({ message: 'Error uploading source', type: 'error' });
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const downloadSource = (source: Source) => {
    window.open(`${API_URL}/sources/download/${source._id}`, '_blank');
  };

  const handleDeleteSource = async () => {
    if (!selectedSourceId) return;

    setDeletingSource(true);

    try {
      const response = await fetch(`${API_URL}/sources/${selectedSourceId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setAlert({ message: 'Source deleted successfully', type: 'success' });
        setShowDeleteSourceDialog(false);
        setSelectedSourceId(null);
        await loadSources();
      } else {
        const errorData = await response.json();
        setAlert({ message: errorData.detail || 'Failed to delete source', type: 'error' });
      }
    } catch (error) {
      console.error('Error deleting source:', error);
      setAlert({ message: 'Error deleting source', type: 'error' });
    } finally {
      setDeletingSource(false);
    }
  };

  const initiateDeleteSource = (sourceId: string) => {
    setSelectedSourceId(sourceId);
    setShowDeleteSourceDialog(true);
  };

  // Refresh only the currently active table
  const refreshCurrentTable = async () => {
    if (activeTab === 'bidInsight') {
      await loadStats();
    } else if (activeTab === 'jobs') {
      await loadJobs();
    } else if (activeTab === 'sources') {
      await loadSources();
    }
  };

  // Filter jobs based on selected users
  const filteredJobs = jobs.filter(job => {
    if (selectedUsers.length === 0) return true;
    
    // Check if any of the selected users have activity on this job
    return selectedUsers.some(selectedUser => {
      const userData = job.users?.find(user => user.userId === selectedUser);
      const hasActivity = (userData?.submitted?.count ?? 0) > 0 || 
                         (userData?.interview?.count ?? 0) > 0 || 
                         (userData?.hire?.count ?? 0) > 0;
      return hasActivity;
    });
  });

  const sortedJobs = [...filteredJobs].sort((a, b) => {
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

  const extractJobId = (url: string) => {
    // Extract job ID from Upwork URL format: www.upwork.com/jobs/~021981209185779549689
    const match = url.match(/jobs\/~(.+)$/);
    return match ? match[1] : url;
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
    // Ensure URL has https protocol
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    window.open(fullUrl, '_blank', 'noopener,noreferrer');
  };

  const handleUserClick = (username: string) => {
    // Set the user filter for the multi-select combobox
    setSelectedUsers([username]);
    // Switch to jobs tab
    setActiveTab('jobs');
    // Reset to first page
    setCurrentPage(1);
    // Keep the current period (today, yesterday, week, month, custom)
    // The period is already set, so no need to change it
  };

  const clearUserFilter = () => {
    setFilteredUser(null);
  };

  const toggleUserSelection = (username: string) => {
    setSelectedUsers(prev => 
      prev.includes(username) 
        ? prev.filter(user => user !== username)
        : [...prev, username]
    );
  };

  const clearSelectedUsers = () => {
    setSelectedUsers([]);
  };

  const toggleUserDropdown = () => {
    setIsUserDropdownOpen(!isUserDropdownOpen);
  };

  const handleUserCheckboxChange = (username: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers(prev => [...prev, username]);
    } else {
      setSelectedUsers(prev => prev.filter(user => user !== username));
    }
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

  // Load data when switching tabs
  useEffect(() => {
    if (activeTab === 'bidInsight') {
      // Set default custom date to day before yesterday
      const dayBeforeYesterday = new Date();
      dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);
      setCustomDate(dayBeforeYesterday.toISOString().split('T')[0]);
      loadStats();
    } else if (activeTab === 'jobs') {
      loadJobs();
    } else if (activeTab === 'sources') {
      loadSources();
    }
  }, [activeTab]);

  // Update only the active table when period changes
  useEffect(() => {
    if (activeTab === 'bidInsight') {
      loadStats();
    } else if (activeTab === 'jobs') {
      loadJobs();
    }
  }, [period, customDate]);

  // Handle window resize for responsive sidebar
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      // Auto-collapse when window is too narrow (less than 1200px)
      if (window.innerWidth < 1200) {
        setSidebarCollapsed(true);
      } else {
        setSidebarCollapsed(false);
      }
    };

    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isUserDropdownOpen && !target.closest('[data-user-dropdown]')) {
        setIsUserDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isUserDropdownOpen]);

  // Prevent sidebar from being resizable by user
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      // Prevent resizing of the sidebar
      if (e.target instanceof Element) {
        const sidebar = document.querySelector('[data-sidebar]');
        if (sidebar && sidebar.contains(e.target)) {
          e.preventDefault();
        }
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
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
      <div 
        data-sidebar
        className={`${sidebarCollapsed ? 'w-16' : 'w-80'} bg-blue-100 dark:bg-blue-900/20 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300 ease-in-out flex-shrink-0`}
        style={{ minWidth: sidebarCollapsed ? '64px' : '320px', maxWidth: sidebarCollapsed ? '64px' : '320px' }}
      >
        <div className={`${sidebarCollapsed ? 'p-4' : 'p-6'} flex-1 flex flex-col`}>
          {/* Logo and Toggle Button */}
          <div className={`mb-8 flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!sidebarCollapsed && (
              <Image 
                src="/tokbyte.png" 
                alt="Upwork Tracker Logo" 
                width={240} 
                height={90}
                className="mx-auto"
              />
            )}
              <button
              onClick={() => {
                console.log('Toggle clicked, current state:', sidebarCollapsed);
                setSidebarCollapsed(!sidebarCollapsed);
              }}
              className="ml-2 p-2 rounded-lg bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-600 shadow-sm"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7M21 12H3" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7M3 12h18" />
                </svg>
              )}
              </button>
            </div>
          
          {/* Navigation */}
          <nav className="flex-1 space-y-2">
            {/* 1. Bid Insight */}
            <button
              onClick={() => setActiveTab('bidInsight')}
              className={`w-full ${sidebarCollapsed ? 'flex justify-center px-3 py-3' : 'text-left px-4 py-3'} rounded-lg font-medium transition-colors flex items-center ${
                activeTab === 'bidInsight'
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title={sidebarCollapsed ? 'Bid Insight' : ''}
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              {!sidebarCollapsed && <span className="ml-3">Bid Insight</span>}
            </button>
            {/* 2. Jobs */}
            <button
              onClick={() => setActiveTab('jobs')}
              className={`w-full ${sidebarCollapsed ? 'flex justify-center px-3 py-3' : 'text-left px-4 py-3'} rounded-lg font-medium transition-colors flex items-center ${
                activeTab === 'jobs'
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title={sidebarCollapsed ? 'Jobs' : ''}
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2V6" />
              </svg>
              {!sidebarCollapsed && <span className="ml-3">Jobs</span>}
            </button>
            {/* 3. Sources */}
            <button
              onClick={() => setActiveTab('sources')}
              className={`w-full ${sidebarCollapsed ? 'flex justify-center px-3 py-3' : 'text-left px-4 py-3'} rounded-lg font-medium transition-colors flex items-center ${
                activeTab === 'sources'
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title={sidebarCollapsed ? 'Sources' : ''}
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              {!sidebarCollapsed && <span className="ml-3">Sources</span>}
            </button>
            {/* 4. Users Management */}
            <button
              onClick={() => setActiveTab('users')}
              className={`w-full ${sidebarCollapsed ? 'flex justify-center px-3 py-3' : 'text-left px-4 py-3'} rounded-lg font-medium transition-colors flex items-center ${
                activeTab === 'users'
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title={sidebarCollapsed ? 'Users Management' : ''}
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              {!sidebarCollapsed && <span className="ml-3">Users Management</span>}
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
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
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
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto min-w-0">
          <div className="w-full max-w-none">
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

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Username
                        </th>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Role
                        </th>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                  {users.map((user, index) => (
                        <tr key={index} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                          <td className="py-4 px-6">
                            <div className="flex items-center space-x-3">
                              <span className="font-medium text-gray-800 dark:text-white">{user.username}</span>
                        </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              user.role === 'admin' 
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                            }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                      <div className="flex space-x-2">
                        <button
                                onClick={() => {
                                  setSelectedUser(user.username);
                                  setShowResetDialog(true);
                                }}
                                className="p-2 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 rounded-lg transition-colors"
                                title="Reset Password"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                </svg>
                        </button>
                        <button
                          onClick={() => handleRemoveUser(user.username)}
                                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                title="Remove User"
                        >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                        </button>
                      </div>
                          </td>
                        </tr>
                  ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'bidInsight' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">Team Performance</h2>
                
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
                      <option value="lastWeek">Last Week</option>
                      <option value="month">This Month</option>
                      <option value="lastMonth">Last Month</option>
                      <option value="custom">Custom Day</option>
                    </select>

                    <button
                      onClick={refreshCurrentTable}
                      disabled={loadingStats}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Refresh
                    </button>

                    <select
                      value={rankBy}
                      onChange={(e) => setRankBy(e.target.value as any)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="count">Total</option>
                      <option value="user">Detail</option>
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

                {/* Total Count */}
                {!loadingStats && allStats.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Total Count</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Total Proposals Card */}
                      <div className="bg-blue-500 rounded-lg p-6 relative overflow-hidden">
                        <div className="relative z-10">
                          <div className="text-white text-sm font-medium mb-2">Total Proposals</div>
                          <div className="text-white text-4xl font-bold">
                            {allStats.reduce((sum, user) => sum + (user.proposals || 0), 0)}
                          </div>
                        </div>
                        <div className="absolute bottom-0 right-0 w-16 h-16 bg-blue-400 rounded-full flex items-center justify-center transform translate-x-4 translate-y-4">
                          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>

                      {/* Total Interviews Card */}
                      <div className="bg-green-500 rounded-lg p-6 relative overflow-hidden">
                        <div className="relative z-10">
                          <div className="text-white text-sm font-medium mb-2">Total Interviews</div>
                          <div className="text-white text-4xl font-bold">
                            {allStats.reduce((sum, user) => sum + (user.interviews || 0), 0)}
                          </div>
                        </div>
                        <div className="absolute bottom-0 right-0 w-16 h-16 bg-green-400 rounded-full flex items-center justify-center transform translate-x-4 translate-y-4">
                          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>

                      {/* Total Hires Card */}
                      <div className="bg-purple-500 rounded-lg p-6 relative overflow-hidden">
                        <div className="relative z-10">
                          <div className="text-white text-sm font-medium mb-2">Total Hires</div>
                          <div className="text-white text-4xl font-bold">
                            {allStats.reduce((sum, user) => sum + (user.hire || 0), 0)}
                          </div>
                        </div>
                        <div className="absolute bottom-0 right-0 w-16 h-16 bg-purple-400 rounded-full flex items-center justify-center transform translate-x-4 translate-y-4">
                          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Per User */}
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
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">Per User</h3>
                      
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
                                      <button
                                        onClick={() => handleUserClick(user.username)}
                                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline font-medium"
                                      >
                                      {user.username}
                                      </button>
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
                                          <button
                                            onClick={() => handleUserClick(proposalsUser.username)}
                                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline"
                                          >
                                            {proposalsUser.username}
                                          </button>: {proposalsUser.proposals}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="py-4 px-6">
                                      <div className="flex items-center">
                                        <span style={{ color: interviewsColor }} className="font-medium">
                                          <button
                                            onClick={() => handleUserClick(interviewsUser.username)}
                                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline"
                                          >
                                            {interviewsUser.username}
                                          </button>: {interviewsUser.interviews}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="py-4 px-6">
                                      <div className="flex items-center">
                                        <span style={{ color: hireColor }} className="font-medium">
                                          <button
                                            onClick={() => handleUserClick(hireUser.username)}
                                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline"
                                          >
                                            {hireUser.username}
                                          </button>: {hireUser.hire}
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
                <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  {/* Left side - Time Period and Filter */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Period:</label>
                    <select
                      value={period}
                      onChange={(e) => setPeriod(e.target.value as any)}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="today">Today</option>
                      <option value="yesterday">Yesterday</option>
                      <option value="week">This Week</option>
                      <option value="lastWeek">Last Week</option>
                      <option value="month">This Month</option>
                      <option value="lastMonth">Last Month</option>
                      <option value="custom">Custom Day</option>
                    </select>
                    </div>

                    {/* User Multi-Select Combobox */}
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Users:</label>
                      <div className="relative" data-user-dropdown>
                        <button
                          type="button"
                          onClick={toggleUserDropdown}
                          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-w-[200px] text-left flex items-center justify-between"
                        >
                          <span className="truncate">
                            {selectedUsers.length === 0 
                              ? 'Select users...' 
                              : selectedUsers.length === 1 
                                ? selectedUsers[0]
                                : `${selectedUsers.length} users selected`
                            }
                          </span>
                          <svg 
                            className={`w-4 h-4 transition-transform ${isUserDropdownOpen ? 'rotate-180' : ''}`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        
                        {isUserDropdownOpen && (
                          <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                            <div className="p-2">
                              {users.map(user => (
                                <label key={user.username} className="flex items-center space-x-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={selectedUsers.includes(user.username)}
                                    onChange={(e) => handleUserCheckboxChange(user.username, e.target.checked)}
                                    className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-700 focus:ring-2 dark:bg-gray-600 dark:border-gray-500"
                                  />
                                  <span className="text-sm text-gray-900 dark:text-white">{user.username}</span>
                                </label>
                              ))}
                            </div>
                            {selectedUsers.length > 0 && (
                              <div className="border-t border-gray-200 dark:border-gray-600 p-2">
                                <button
                                  onClick={clearSelectedUsers}
                                  className="w-full text-left px-2 py-1 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                >
                                  Clear all
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={refreshCurrentTable}
                      disabled={loadingJobs}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Refresh
                    </button>
                  </div>

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
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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


                  {/* Right side - Sort Controls */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Sort by:</label>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="postedDate">Posted Date</option>
                        <option value="proposals">Proposals</option>
                        <option value="interviews">Interviews</option>
                        <option value="hire">Hires</option>
                      </select>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Order:</label>
                      <select
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value as any)}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="desc">Descending</option>
                        <option value="asc">Ascending</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Filter Status */}
                {selectedUsers.length > 0 && (
                  <div className="mb-4 flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Filtered by: <span className="font-medium text-blue-600 dark:text-blue-400">{selectedUsers.join(', ')}</span>
                    </span>
                    <button
                      onClick={clearSelectedUsers}
                      className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-500 transition"
                    >
                      Clear
                    </button>
                  </div>
                )}

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
                    <table className="w-full min-w-[800px]">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300 min-w-[200px]">
                            Title
                          </th>
                          <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300 min-w-[250px]">
                            Description
                          </th>
                          <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300 min-w-[150px]">
                            Skills
                          </th>
                          <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300 w-32">
                            Job ID
                          </th>
                          <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300 min-w-[100px]">
                            Posted Date
                          </th>
                          <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300 min-w-[100px]">
                            Proposals
                          </th>
                          <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300 min-w-[100px]">
                            Interviews
                          </th>
                          <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300 min-w-[100px]">
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
                            <td className="py-4 px-6 w-20">
                              <button
                                onClick={() => openUrlInNewTab(job.url)}
                                className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 hover:underline"
                                title={job.url}
                              >
                                {extractJobId(job.url)}
                              </button>
                            </td>
                            <td className="py-4 px-6 text-gray-800 dark:text-gray-200">
                              {formatTimeAgo(job.postedDate)}
                            </td>
                            <td className="py-4 px-6 text-gray-800 dark:text-gray-200">
                              <div className="text-center">
                                <div className="font-semibold text-lg">{job.proposalsCount || 0}</div>
                                {getUserNamesForJob(job, 'submitted') && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {getUserNamesForJob(job, 'submitted')}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-6 text-gray-800 dark:text-gray-200">
                              <div className="text-center">
                                <div className="font-semibold text-lg">{job.interviewsCount || 0}</div>
                                {getUserNamesForJob(job, 'interview') && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {getUserNamesForJob(job, 'interview')}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-6 text-gray-800 dark:text-gray-200">
                              <div className="text-center">
                                <div className="font-semibold text-lg">{job.hireCount || 0}</div>
                                {getUserNamesForJob(job, 'hire') && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {getUserNamesForJob(job, 'hire')}
                                  </div>
                                )}
                              </div>
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

            {/* Sources Tab Content */}
            {activeTab === 'sources' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Sources</h2>
                  <button
                    onClick={() => setShowUploadDialog(true)}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Upload
                  </button>
                </div>

                {loadingSources ? (
                  <div className="text-center py-8">
                    <div className="text-gray-600">Loading sources...</div>
                  </div>
                ) : sources.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-600">No sources available.</div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sources.map((source) => (
                      <div key={source._id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600 relative">
                        {/* Delete Icon */}
                        <button
                          onClick={() => initiateDeleteSource(source._id)}
                          className="absolute top-2 right-2 p-1 text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors"
                          title="Delete source"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                        <h3 className="font-semibold text-gray-800 dark:text-white mb-2 pr-8">{source.title}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{source.description}</p>
                        <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 mb-3">
                          <span>By: {source.uploadedBy}</span>
                          <span>{new Date(source.uploadedAt).toLocaleDateString()}</span>
                        </div>
                        <button
                          onClick={() => downloadSource(source)}
                          className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Download
                        </button>
                      </div>
                    ))}
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

      {/* Upload Dialog */}
      {showUploadDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Upload Source</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Title</label>
              <input
                type="text"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                disabled={uploading}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Enter title"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
              <textarea
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
                disabled={uploading}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Enter description"
                rows={3}
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">File</label>
              <input
                type="file"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                disabled={uploading}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Upload Progress Display */}
            {uploading && (
              <div className="mb-4">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <div className="animate-spin">
                    <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <span className="text-lg font-semibold text-blue-500">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowUploadDialog(false);
                  setUploadTitle('');
                  setUploadDescription('');
                  setUploadFile(null);
                  setUploading(false);
                  setUploadProgress(0);
                }}
                disabled={uploading}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleFileUpload}
                disabled={uploading}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteSourceDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Delete Source</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to delete this source? This action cannot be undone.
            </p>
            
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowDeleteSourceDialog(false);
                  setSelectedSourceId(null);
                }}
                disabled={deletingSource}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSource}
                disabled={deletingSource}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deletingSource ? (
                  <>
                    <div className="animate-spin">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </div>
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
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

