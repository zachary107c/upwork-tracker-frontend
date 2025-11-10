'use client';

interface UserStats {
  username: string;
  displayName?: string;
  proposals: number;
  interviews: number;
  hire: number;
}

interface PieChartCardProps {
  title: string;
  data: UserStats[];
  dataKey: keyof UserStats;
  colors: string[];
}

const PieChartCard: React.FC<PieChartCardProps> = ({ title, data, dataKey, colors }) => {
  const filteredData = data.filter(user => (user[dataKey] as number) > 0);
  const total = data.reduce((sum, user) => sum + (user[dataKey] as number), 0);

  // Create consistent color mapping
  const getUserColor = (username: string) => {
    const userIndex = data.findIndex(u => u.username === username);
    return colors[userIndex % colors.length];
  };

  const chartData = filteredData.map(user => ({
    username: user.username,
    displayName: user.displayName || user.username,
    value: user[dataKey] as number,
    color: getUserColor(user.username)
  }));

  return (
    <div className="bg-white rounded-xl p-6 border">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">{title}</h3>
      
      <div className="flex">
        {/* Chart on the left */}
        <div className="flex-1">
          <div className="h-64 flex items-center justify-center">
            {total > 0 ? (
              <div className="relative w-48 h-48">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  {(() => {
                    let cumulativeAngle = 0;
                    
                    return chartData.map((user) => {
                      // If there's only one user, show a full circle
                      const angle = chartData.length === 1 ? 360 : (user.value / total) * 360;
                      const x1 = 50 + 40 * Math.cos(cumulativeAngle * Math.PI / 180);
                      const y1 = 50 + 40 * Math.sin(cumulativeAngle * Math.PI / 180);
                      const x2 = 50 + 40 * Math.cos((cumulativeAngle + angle) * Math.PI / 180);
                      const y2 = 50 + 40 * Math.sin((cumulativeAngle + angle) * Math.PI / 180);
                      const largeArcFlag = angle > 180 ? 1 : 0;
                      
                      const pathData = [
                        `M 50 50`,
                        `L ${x1} ${y1}`,
                        `A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                        `Z`
                      ].join(' ');
                      
                      cumulativeAngle += angle;
                      
                      return (
                        <path
                          key={user.username}
                          d={pathData}
                          fill={user.color}
                          stroke="white"
                          strokeWidth="2"
                        />
                      );
                    });
                  })()}
</svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-800">{total}</span>
                </div>
              </div>
            ) : (
              <div className="text-gray-400">No data available</div>
            )}
          </div>
          
          <div className="text-center text-sm text-gray-600">
            {filteredData.length} users participating
          </div>
        </div>

        {/* Legend on the right - only show if more than one user has data */}
        {filteredData.length > 1 && (
          <div className="w-32 ml-4 flex flex-col justify-center">
            <div className="space-y-2">
              {filteredData.map((user) => (
                <div key={user.username} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: getUserColor(user.username) }}
                  ></div>
                  <span className="text-xs text-gray-600 truncate">
                    {(user.displayName || user.username)}: {user[dataKey] as number}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PieChartCard;
