'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@/components/Alert';
import Image from 'next/image';
import ThemeToggle from '@/components/ThemeToggle';

const API_URL = 'http://174.138.178.245:8000';

interface UserStats {
  username: string;
  displayName?: string;
  proposals: number;
  interviews: number;
  hire: number;
  proposalsTime?: string;
  interviewsTime?: string;
  hireTime?: string;
}

interface UserStatsWithRank extends UserStats {
  proposalsRank: number;
  interviewsRank: number;
  hireRank: number;
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

export default function UserDashboardPage() {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = useState<'bid-insight' | 'jobs' | 'sources' | 'user-management'>('bid-insight');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [windowWidth, setWindowWidth] = useState(0);
  const [period, setPeriod] = useState<'today' | 'yesterday' | 'week' | 'lastWeek' | 'month' | 'lastMonth' | 'custom'>('today');
  const [customDate, setCustomDate] = useState('');
  const [myStats, setMyStats] = useState<UserStats>({ username: '', proposals: 0, interviews: 0, hire: 0 });
  const [allStats, setAllStats] = useState<UserStatsWithRank[]>([]);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  // Jobs state
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'proposals' | 'interviews' | 'postedDate' | 'hire'>('postedDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());
  const [jobFilter, setJobFilter] = useState<'all' | 'submitted' | 'not-submitted'>('all');
  
  // Sources state
  const [sources, setSources] = useState<Source[]>([]);
  const [loadingSources, setLoadingSources] = useState(false);
  
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const user = sessionStorage.getItem('user');
    const isAdmin = sessionStorage.getItem('isAdmin');
    
    console.log('User dashboard - user data:', user);
    console.log('User dashboard - isAdmin:', isAdmin);
    
    if (!user) {
      console.log('No user data, redirecting to login');
      router.push('/');
      return;
    }
    
    if (isAdmin === 'true') {
      console.log('Admin detected, redirecting to admin dashboard');
      router.push('/dashboard');
      return;
    }
    
    console.log('Regular user, staying on user dashboard');

    const userData = JSON.parse(user);
    setUsername(userData.username);
    setDisplayName(userData.display_name || userData.username);
    
    // Set default custom date to day before yesterday
    const dayBeforeYesterday = new Date();
    dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);
    setCustomDate(dayBeforeYesterday.toISOString().split('T')[0]);
  }, [router]);

  // Load stats when username is set or period changes
  useEffect(() => {
    if (username) {
      loadStats();
    }
  }, [username, period, customDate]);

  // Load data when tab is active
  useEffect(() => {
    if (activeTab === 'jobs') {
      loadJobs();
    } else if (activeTab === 'sources') {
      loadSources();
    }
  }, [activeTab]);

  // Update jobs when period changes (only if jobs tab is active)
  useEffect(() => {
    if (activeTab === 'jobs') {
      loadJobs();
    }
  }, [period, customDate]);

  // Handle window resize for automatic sidebar collapse
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

  const loadStats = async () => {
    try {
      setLoading(true);
      console.log('Loading stats for username:', username, 'period:', period); // Debug log
      
      let response;
      
      if (period === 'custom') {
        if (!customDate) return;
        console.log('Using custom date:', customDate); // Debug log
        response = await fetch(`${API_URL}/get_bid_insight_custom`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, date: customDate })
        });
      } else {
        const endpoint = period === 'today' ? 'get_bid_insight' :
                        period === 'yesterday' ? 'get_bid_insight_yesterday' :
                        period === 'week' ? 'get_bid_insight_weekly' :
                        period === 'lastWeek' ? 'get_bid_insight_last_week' :
                        period === 'month' ? 'get_bid_insight_monthly' :
                        'get_bid_insight_last_month';
        
        console.log('Using endpoint:', endpoint); // Debug log
        response = await fetch(`${API_URL}/${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username })
        });
      }
      
      console.log('Response status:', response.status); // Debug log
      
      if (response.ok) {
        const data = await response.json();
        console.log('Combined stats data received:', data); // Debug log
        
        // Set my stats
        setMyStats({ 
          username, 
          displayName: data.myStats.display_name || data.myStats.displayName || username,
          proposals: data.myStats.proposals || 0, 
          interviews: data.myStats.interviews || 0, 
          hire: data.myStats.hire || 0,
          proposalsTime: data.myStats.proposalsTime,
          interviewsTime: data.myStats.interviewsTime,
          hireTime: data.myStats.hireTime
        });
        
        // Set all stats with ranks
        const normalizedStats = (data.allStats || []).map((user: any) => ({
          ...user,
          displayName: user.display_name || user.displayName || user.username,
        }));
        const statsWithRank = calculateRanks(normalizedStats);
        setAllStats(statsWithRank);
      } else {
        const errorText = await response.text();
        console.error('Error response:', errorText); // Debug log
        setAlert({ message: 'Failed to load statistics', type: 'error' });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
      setAlert({ message: 'Network error loading statistics', type: 'error' });
    } finally {
      setLoading(false);
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

  const downloadSource = (source: Source) => {
    window.open(`${API_URL}/sources/download/${source._id}`, '_blank');
  };

  // Refresh only the currently active table
  const refreshCurrentTable = async () => {
    if (activeTab === 'bid-insight') {
      await loadStats();
    } else if (activeTab === 'jobs') {
      await loadJobs();
    } else if (activeTab === 'sources') {
      await loadSources();
    }
  };

  // Get user names for job statistics
  const getUserNamesForJob = (job: Job, type: 'submitted' | 'interview' | 'hire') => {
    if (!job.users || job.users.length === 0) return [];
    
    return job.users
      .filter(user => user[type] && user[type].count > 0)
      .map(user => {
        const match = allStats.find(u => u.username === user.userId);
        const name = match?.displayName || user.userId;
        return `${name}: ${user[type].count}`;
      })
      .join(', ');
  };

  // Filter jobs based on user's submission status
  const filteredJobs = jobs.filter(job => {
    if (jobFilter === 'all') return true;
    
    const userData = job.users?.find(user => user.userId === username);
    const hasSubmitted = (userData?.submitted?.count ?? 0) > 0;
    
    if (jobFilter === 'submitted') {
      return hasSubmitted;
    } else if (jobFilter === 'not-submitted') {
      return !hasSubmitted;
    }
    
    return true;
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


  const calculateRanks = (stats: UserStats[]): UserStatsWithRank[] => {
    // Sort by each metric and assign ranks, breaking ties by time (earlier = higher rank)
    const sortedByProposals = [...stats].sort((a, b) => {
      if (b.proposals !== a.proposals) {
        return b.proposals - a.proposals; // Higher count first
      }
      // If counts are equal, sort by time (earlier time first)
      if (a.proposalsTime && b.proposalsTime) {
        return new Date(a.proposalsTime).getTime() - new Date(b.proposalsTime).getTime();
      }
      // If no time data, maintain original order
      return 0;
    });

    const sortedByInterviews = [...stats].sort((a, b) => {
      if (b.interviews !== a.interviews) {
        return b.interviews - a.interviews; // Higher count first
      }
      // If counts are equal, sort by time (earlier time first)
      if (a.interviewsTime && b.interviewsTime) {
        return new Date(a.interviewsTime).getTime() - new Date(b.interviewsTime).getTime();
      }
      // If no time data, maintain original order
      return 0;
    });

    const sortedByHire = [...stats].sort((a, b) => {
      if (b.hire !== a.hire) {
        return b.hire - a.hire; // Higher count first
      }
      // If counts are equal, sort by time (earlier time first)
      if (a.hireTime && b.hireTime) {
        return new Date(a.hireTime).getTime() - new Date(b.hireTime).getTime();
      }
      // If no time data, maintain original order
      return 0;
    });

    return stats.map(user => ({
      ...user,
      proposalsRank: sortedByProposals.findIndex(u => u.username === user.username) + 1,
      interviewsRank: sortedByInterviews.findIndex(u => u.username === user.username) + 1,
      hireRank: sortedByHire.findIndex(u => u.username === user.username) + 1,
    }));
  };

  const getRankedData = () => {
    if (allStats.length === 0) return [];
    
    // Get unique ranks
    const maxRank = Math.max(...allStats.map(s => Math.max(s.proposalsRank, s.interviewsRank, s.hireRank)));
    const rankedData = [];
    
    for (let rank = 1; rank <= maxRank; rank++) {
      const proposalsUsers = allStats.filter(s => s.proposalsRank === rank);
      const interviewsUsers = allStats.filter(s => s.interviewsRank === rank);
      const hireUsers = allStats.filter(s => s.hireRank === rank);
      
      rankedData.push({
        rank,
        proposals: proposalsUsers.map(u => ({ username: u.username, displayName: u.displayName || u.username, count: u.proposals })),
        interviews: interviewsUsers.map(u => ({ username: u.username, displayName: u.displayName || u.username, count: u.interviews })),
        hire: hireUsers.map(u => ({ username: u.username, displayName: u.displayName || u.username, count: u.hire }))
      });
    }
    
    return rankedData;
  };

  const getRankColor = (rank: number, total: number) => {
    if (total === 1) return '#10b981'; // Green for single user
    if (rank === 1) return '#10b981'; // Green for 1st place
    if (rank === 2) return '#f59e0b'; // Amber for 2nd place
    if (rank === 3) return '#ef4444'; // Red for 3rd place
    return '#6b7280'; // Gray for other ranks
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setAlert({ message: 'New passwords do not match', type: 'error' });
      return;
    }
    
    if (newPassword.length < 6) {
      setAlert({ message: 'Password must be at least 6 characters long', type: 'error' });
      return;
    }

    setPasswordLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username, 
          new_password: newPassword 
        })
      });
      
      if (response.ok) {
        setAlert({ message: 'Password updated successfully!', type: 'success' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const data = await response.json();
        setAlert({ message: data.detail || 'Failed to update password', type: 'error' });
      }
    } catch (error) {
      setAlert({ message: 'Network error updating password', type: 'error' });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.clear();
    router.push('/');
  };

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod as any);
  };


  // Remove the full page loading - we'll show loading per section instead

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Sidebar */}
      <div 
        data-sidebar
        className={`${sidebarCollapsed ? 'w-16' : 'w-80'} bg-blue-100 dark:bg-blue-900/20 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300 ease-in-out flex-shrink-0`}
        style={{ minWidth: sidebarCollapsed ? '64px' : '320px', maxWidth: sidebarCollapsed ? '64px' : '320px' }}
      >
        <div className={`${sidebarCollapsed ? 'p-2' : 'p-6'} flex-1 flex flex-col`}>
          {/* Logo and Toggle Button */}
          {!sidebarCollapsed && (
            <div className="mb-8 flex items-center justify-between">
              <Image 
                src="/tokbyte.png" 
                alt="Upwork Tracker Logo" 
                width={240} 
                height={90}
                className="mx-auto"
              />
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="ml-2 p-2 rounded-lg bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-600 shadow-sm"
                title="Collapse sidebar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7M3 12h18" />
                </svg>
              </button>
            </div>
          )}
          
          {/* Toggle button when collapsed */}
          {sidebarCollapsed && (
            <div className="mb-4 flex justify-center">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2 rounded-lg bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-600 shadow-sm"
                title="Expand sidebar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7M21 12H3" />
                </svg>
              </button>
            </div>
          )}
          
          {/* Navigation */}
          <nav className={`${sidebarCollapsed ? 'space-y-1' : 'space-y-2'} flex-1`}>
            {/* 1. Bid Insight */}
            <button
              onClick={() => setActiveTab('bid-insight')}
              className={`w-full ${sidebarCollapsed ? 'flex justify-center px-1 py-2' : 'text-left px-4 py-3'} rounded-lg font-medium transition-colors flex items-center ${
                activeTab === 'bid-insight'
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <svg className={`${sidebarCollapsed ? 'w-4 h-4' : 'w-5 h-5'} flex-shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              {!sidebarCollapsed && <span className="ml-3">Bid Insight</span>}
            </button>
            {/* 2. Jobs */}
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
            {/* 3. Sources */}
            <button
              onClick={() => setActiveTab('sources')}
              className={`w-full ${sidebarCollapsed ? 'flex justify-center px-1 py-2' : 'text-left px-4 py-3'} rounded-lg font-medium transition-colors flex items-center ${
                activeTab === 'sources'
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <svg className={`${sidebarCollapsed ? 'w-4 h-4' : 'w-5 h-5'} flex-shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              {!sidebarCollapsed && <span className="ml-3">Sources</span>}
            </button>
            {/* 4. My Profile */}
            <button
              onClick={() => setActiveTab('user-management')}
              className={`w-full ${sidebarCollapsed ? 'flex justify-center px-1 py-2' : 'text-left px-4 py-3'} rounded-lg font-medium transition-colors flex items-center ${
                activeTab === 'user-management'
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <svg className={`${sidebarCollapsed ? 'w-4 h-4' : 'w-5 h-5'} flex-shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {!sidebarCollapsed && <span className="ml-3">My Profile</span>}
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
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">
                Welcome, <span className="font-bold text-blue-600 dark:text-blue-400 text-base sm:text-lg">{displayName || username}</span>
              </span>
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto min-w-0">

          <div className="w-full max-w-none">
            {activeTab === 'user-management' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">Update Password</h2>
                
                <form onSubmit={handlePasswordUpdate} className="max-w-md space-y-4">
                  <div>
                    <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      Current Password
                    </label>
                    <input
                      type="password"
                      id="currentPassword"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      New Password
                    </label>
                    <input
                      type="password"
                      id="newPassword"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      id="confirmPassword"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                    />
                  </div>
                  
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="w-full bg-primary-500 text-white py-3 rounded-lg font-semibold hover:bg-primary-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {passwordLoading ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'bid-insight' && (
              <div className="space-y-6">
                {/* Period Selector */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Bid Insight</h2>
                    <button
                      onClick={refreshCurrentTable}
                      disabled={loading}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Refresh
                    </button>
                  </div>
                  
                  <div className="flex flex-wrap gap-4 items-center">
                    <select
                      value={period}
                      onChange={(e) => handlePeriodChange(e.target.value)}
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
                    
                    {period === 'custom' && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const currentDate = new Date(customDate);
                            currentDate.setDate(currentDate.getDate() - 1);
                            setCustomDate(currentDate.toISOString().split('T')[0]);
                          }}
                          className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
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
                          className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
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

                {/* My Stats */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">My Performance</h3>
                  
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="text-gray-600 dark:text-gray-400">Loading performance data...</div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-gray-800 dark:text-white">
                        {myStats.proposals}
                        {allStats.length > 0 && (
                          <span 
                            className="text-lg ml-2 font-semibold"
                            style={{ color: getRankColor(
                              allStats.find(s => s.username === username)?.proposalsRank || 1, 
                              allStats.length
                            )}}
                          >
                            , {allStats.find(s => s.username === username)?.proposalsRank || 1}
                            {allStats.find(s => s.username === username)?.proposalsRank === 1 ? 'st' :
                             allStats.find(s => s.username === username)?.proposalsRank === 2 ? 'nd' :
                             allStats.find(s => s.username === username)?.proposalsRank === 3 ? 'rd' : 'th'}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">Proposals</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-gray-800 dark:text-white">
                        {myStats.interviews}
                        {allStats.length > 0 && (
                          <span 
                            className="text-lg ml-2 font-semibold"
                            style={{ color: getRankColor(
                              allStats.find(s => s.username === username)?.interviewsRank || 1, 
                              allStats.length
                            )}}
                          >
                            , {allStats.find(s => s.username === username)?.interviewsRank || 1}
                            {allStats.find(s => s.username === username)?.interviewsRank === 1 ? 'st' :
                             allStats.find(s => s.username === username)?.interviewsRank === 2 ? 'nd' :
                             allStats.find(s => s.username === username)?.interviewsRank === 3 ? 'rd' : 'th'}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">Interviews</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-gray-800 dark:text-white">
                        {myStats.hire}
                        {allStats.length > 0 && (
                          <span 
                            className="text-lg ml-2 font-semibold"
                            style={{ color: getRankColor(
                              allStats.find(s => s.username === username)?.hireRank || 1, 
                              allStats.length
                            )}}
                          >
                            , {allStats.find(s => s.username === username)?.hireRank || 1}
                            {allStats.find(s => s.username === username)?.hireRank === 1 ? 'st' :
                             allStats.find(s => s.username === username)?.hireRank === 2 ? 'nd' :
                             allStats.find(s => s.username === username)?.hireRank === 3 ? 'rd' : 'th'}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">Hires</div>
                    </div>
                  </div>
                  )}
                </div>

                {/* Team Comparison */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Team Performance</h3>
                  
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="text-gray-600 dark:text-gray-400">Loading team data...</div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-medium text-gray-600">Rank</th>
                          <th className="text-center py-3 px-4 font-medium text-gray-600">Proposals</th>
                          <th className="text-center py-3 px-4 font-medium text-gray-600">Interviews</th>
                          <th className="text-center py-3 px-4 font-medium text-gray-600">Hires</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getRankedData().map((rankData) => {
                          return (
                            <tr key={rankData.rank} className="border-b">
                              <td className="py-3 px-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <span 
                                    className="text-lg font-bold ml-2"
                                    style={{ 
                                      color: getRankColor(rankData.rank, allStats.length)
                                    }}
                                  >
                                    {rankData.rank}
                                  </span>
                                  {rankData.rank === 1 && <span className="text-sm">🥇</span>}
                                  {rankData.rank === 2 && <span className="text-sm">🥈</span>}
                                  {rankData.rank === 3 && <span className="text-sm">🥉</span>}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <div className="space-y-1">
                                  {rankData.proposals.map((user, index) => (
                                    <div key={index} className={`text-sm ${user.username === username ? 'font-bold' : ''}`} style={{ color: user.username === username ? '#10b981' : '#3b82f6' }}>
                                      <span>{user.displayName}</span>: {user.count}
                                      {user.username === username && <span className="ml-1 text-xs text-emerald-500">you</span>}
                                    </div>
                                  ))}
                                  {rankData.proposals.length === 0 && (
                                    <div className="text-sm text-gray-400">-</div>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <div className="space-y-1">
                                  {rankData.interviews.map((user, index) => (
                                    <div key={index} className={`text-sm ${user.username === username ? 'font-bold' : ''}`} style={{ color: user.username === username ? '#10b981' : '#3b82f6' }}>
                                      <span>{user.displayName}</span>: {user.count}
                                      {user.username === username && <span className="ml-1 text-xs text-emerald-500">you</span>}
                                    </div>
                                  ))}
                                  {rankData.interviews.length === 0 && (
                                    <div className="text-sm text-gray-400">-</div>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <div className="space-y-1">
                                  {rankData.hire.map((user, index) => (
                                    <div key={index} className={`text-sm ${user.username === username ? 'font-bold' : ''}`} style={{ color: user.username === username ? '#10b981' : '#3b82f6' }}>
                                      <span>{user.displayName}</span>: {user.count}
                                      {user.username === username && <span className="ml-1 text-xs text-emerald-500">you</span>}
                                    </div>
                                  ))}
                                  {rankData.hire.length === 0 && (
                                    <div className="text-sm text-gray-400">-</div>
                                  )}
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
              </div>
            )}

            {activeTab === 'jobs' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Jobs</h2>
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
                        <option value="month">This Month</option>
                        <option value="custom">Custom Day</option>
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
                </div>

                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter:</label>
                      <select
                        value={jobFilter}
                        onChange={(e) => setJobFilter(e.target.value as any)}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="all">All Jobs</option>
                        <option value="submitted">Jobs I Submitted Proposals</option>
                        <option value="not-submitted">Jobs I Haven't Submitted</option>
                      </select>
                    </div>
                  </div>

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

                {/* Jobs Table */}
                {loadingJobs ? (
                  <div className="text-center py-8">
                    <div className="text-gray-600 dark:text-gray-400">Loading jobs...</div>
                  </div>
                ) : paginatedJobs.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-600 dark:text-gray-400">No jobs available.</div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Title
                          </th>
                          <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Description
                          </th>
                          <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Skills
                          </th>
                          <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300 w-20">
                            Job ID
                          </th>
                          <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Posted Date
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
                    <div className="text-sm text-gray-700 dark:text-gray-300">
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
                      <span className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300">
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
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">Sources</h2>

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
                      <div key={source._id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                        <h3 className="font-semibold text-gray-800 dark:text-white mb-2">{source.title}</h3>
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
