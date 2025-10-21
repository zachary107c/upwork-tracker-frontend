'use client';

interface User {
  username: string;
  role: string;
  is_admin?: boolean;
}

interface UserTableProps {
  users: User[];
  onResetPassword: (username: string) => void;
  onDeleteUser: (username: string) => void;
}

export default function UserTable({ users, onResetPassword, onDeleteUser }: UserTableProps) {
  console.log('UserTable received users:', users);
  
  return (
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
            <th className="text-right py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 ? (
            <tr>
              <td colSpan={3} className="text-center py-8 text-gray-500 dark:text-gray-400">
                No users found
              </td>
            </tr>
          ) : (
            users.map((user) => {
              const isAdmin = user.role === 'admin' || user.is_admin;
              console.log(`User ${user.username}:`, {
                role: user.role,
                is_admin: user.is_admin,
                isAdmin: isAdmin
              });
              
              return (
                <tr key={user.username} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                  <td className="py-4 px-6 text-gray-800 dark:text-gray-200">{user.username}</td>
                  <td className="py-4 px-6 text-gray-600 dark:text-gray-300">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      isAdmin
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' 
                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                    }`}>
                      {isAdmin ? 'admin' : 'user'}
                    </span>
                  </td>
                <td className="py-4 px-6 text-right">
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => onResetPassword(user.username)}
                      className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
                      title="Reset Password"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => onDeleteUser(user.username)}
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                      title="Delete User"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

