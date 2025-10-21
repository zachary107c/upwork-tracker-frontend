'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@/components/Alert';
import Image from 'next/image';
import ThemeToggle from '@/components/ThemeToggle';

const API_URL = 'http://localhost:8000';

interface UserStats {
  username: string;
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

export default function UserDashboardPage() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = useState<'user-management' | 'bid-insight' | 'jobs'>('user-management');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [windowWidth, setWindowWidth] = useState(0);
  const [period, setPeriod] = useState<'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom'>('today');
  const [customDate, setCustomDate] = useState('');
  const [myStats, setMyStats] = useState<UserStats>({ username: '', proposals: 0, interviews: 0, hire: 0 });
  const [allStats, setAllStats] = useState<UserStatsWithRank[]>([]);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
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
    
    // Set default custom date to day before yesterday
    const dayBeforeYesterday = new Date();
    dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);
    setCustomDate(dayBeforeYesterday.toISOString().split('T')[0]);
  }, [router]);

  // Separate useEffect to load stats when username is set
  useEffect(() => {
    if (username) {
      loadStats();
    }
  }, [username, period, customDate]);

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
                        period === 'this_week' ? 'get_bid_insight_weekly' :
                        'get_bid_insight_monthly';
        
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
          proposals: data.myStats.proposals || 0, 
          interviews: data.myStats.interviews || 0, 
          hire: data.myStats.hire || 0,
          proposalsTime: data.myStats.proposalsTime,
          interviewsTime: data.myStats.interviewsTime,
          hireTime: data.myStats.hireTime
        });
        
        // Set all stats with ranks
        const statsWithRank = calculateRanks(data.allStats || []);
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
        proposals: proposalsUsers.map(u => ({ username: u.username, count: u.proposals })),
        interviews: interviewsUsers.map(u => ({ username: u.username, count: u.interviews })),
        hire: hireUsers.map(u => ({ username: u.username, count: u.hire }))
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
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">
                Welcome, <span className="font-bold text-blue-600 dark:text-blue-400 text-base sm:text-lg">{username}</span>
              </span>
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">

          <div className="max-w-6xl mx-auto">
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
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Bid Insight</h2>
                  
                  <div className="flex flex-wrap gap-4 items-center">
                    <select
                      value={period}
                      onChange={(e) => handlePeriodChange(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="today">Today</option>
                      <option value="yesterday">Yesterday</option>
                      <option value="this_week">This Week</option>
                      <option value="this_month">This Month</option>
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
                </div>

                {/* Team Comparison */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Team Performance</h3>
                  
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
                                      {user.username}: {user.count}
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
                                      {user.username}: {user.count}
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
                                      {user.username}: {user.count}
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
                </div>
              </div>
            )}

            {activeTab === 'jobs' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">Jobs</h2>
                <div className="text-center py-8">
                  <div className="text-gray-600 dark:text-gray-400">
                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2V6" />
                    </svg>
                    <p className="text-lg font-medium mb-2">Jobs Feature Coming Soon</p>
                    <p className="text-sm">This feature will show job listings and tracking information.</p>
                  </div>
                </div>
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
