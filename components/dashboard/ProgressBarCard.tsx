'use client';

interface UserStats {
  username: string;
  proposals: number;
  interviews: number;
  hire: number;
}

interface ProgressBarCardProps {
  title: string;
  data: UserStats[];
  dataKey: keyof UserStats;
  colors: string[];
}

const ProgressBarCard: React.FC<ProgressBarCardProps> = ({ title, data, dataKey, colors }) => {
  // Create consistent color mapping
  const getUserColor = (username: string) => {
    const userIndex = data.findIndex(u => u.username === username);
    return colors[userIndex % colors.length];
  };

  const maxValue = Math.max(...data.map(u => u[dataKey]), 1);

  return (
    <div className="bg-white rounded-xl p-6 border">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">{title}</h3>
      
      <div className="h-64 flex flex-col justify-center space-y-4">
        {data.map((user) => {
          const percentage = (user[dataKey] / maxValue) * 100;
          
          return (
            <div key={user.username} className="flex items-center space-x-3">
              <div className="w-20 text-sm text-gray-600 truncate">{user.username}</div>
              <div className="flex-1 bg-gray-200 rounded-full h-4">
                <div 
                  className="h-4 rounded-full transition-all duration-300" 
                  style={{ 
                    width: `${Math.max(10, percentage)}%`,
                    backgroundColor: getUserColor(user.username)
                  }}
                ></div>
              </div>
              <div className="w-8 text-sm font-medium">{user[dataKey]}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProgressBarCard;
