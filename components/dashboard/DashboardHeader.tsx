'use client';

interface DashboardHeaderProps {
  dashboardPeriod: 'today' | 'yesterday' | 'week' | 'month' | 'custom';
  setDashboardPeriod: (period: 'today' | 'yesterday' | 'week' | 'month' | 'custom') => void;
  dashboardCustomDate: string;
  setDashboardCustomDate: (date: string) => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  dashboardPeriod,
  setDashboardPeriod,
  dashboardCustomDate,
  setDashboardCustomDate
}) => {
  return (
    <div className="bg-white rounded-xl p-6 border mb-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Dashboard Analytics</h2>
      
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex gap-2">
          {(['today', 'yesterday', 'week', 'month', 'custom'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setDashboardPeriod(period)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                dashboardPeriod === period
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </button>
          ))}
        </div>

        {dashboardPeriod === 'custom' && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Custom Date:</label>
            <input
              type="date"
              value={dashboardCustomDate}
              onChange={(e) => setDashboardCustomDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardHeader;
