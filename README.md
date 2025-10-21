# TokByte Admin Frontend

A modern Next.js 14 frontend application for the TokByte authentication system with admin and user dashboards.

## 🚀 Features

- **Authentication System**: Secure login with role-based access control
- **Admin Dashboard**: Complete user management and statistics
- **User Dashboard**: Personal dashboard for regular users
- **Modern UI**: Built with Tailwind CSS and responsive design
- **Theme Support**: Dark/light mode toggle
- **Real-time Data**: Live statistics and user management

## 🛠️ Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Custom components with Tailwind CSS
- **State Management**: React hooks and context API

## 📦 Installation

1. Navigate to the Frontend directory:
   ```bash
   cd Frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:3000`

## 🏗️ Project Structure

```
Frontend/
├── app/                    # Next.js App Router
│   ├── dashboard/         # Admin dashboard page
│   ├── user-dashboard/    # User dashboard page
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout component
│   └── page.tsx           # Login page
├── components/            # Reusable UI components
│   ├── dashboard/         # Dashboard-specific components
│   ├── Alert.tsx          # Alert notification component
│   ├── Dialog.tsx         # Modal dialog component
│   ├── ThemeToggle.tsx    # Theme switcher component
│   └── UserTable.tsx      # User data table component
├── contexts/              # React context providers
│   └── ThemeContext.tsx   # Theme management context
└── public/                # Static assets
```

## 🎨 Components

### Core Components

- **Alert**: Notification system for success/error messages
- **Dialog**: Modal dialogs for user interactions
- **ThemeToggle**: Dark/light mode switcher
- **UserTable**: Data table for displaying user information

### Dashboard Components

- **DashboardHeader**: Header with user info and controls
- **PieChartCard**: Statistics visualization
- **ProgressBarCard**: Progress tracking display

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file in the Frontend directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Tailwind CSS

The project uses Tailwind CSS for styling. Configuration is in `tailwind.config.js`:

```javascript
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

## 🚀 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## 📱 Pages

### Login Page (`/`)
- User authentication form
- Role-based redirection
- Error handling and notifications

### Admin Dashboard (`/dashboard`)
- User management interface
- Statistics and analytics
- Admin-only features

### User Dashboard (`/user-dashboard`)
- Personal user interface
- User-specific data display

## 🎨 Styling

The application uses Tailwind CSS with a modern design system:

- **Colors**: Purple and blue gradient themes
- **Typography**: Clean, readable fonts
- **Layout**: Responsive grid and flexbox layouts
- **Components**: Consistent button styles and form elements

## 🔌 API Integration

The frontend communicates with the FastAPI backend:

- **Base URL**: `http://localhost:8000`
- **Authentication**: JWT-based authentication
- **Endpoints**: 
  - `/signin` - User authentication
  - `/users` - User management
  - `/stats` - Statistics data

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

### Deploy to Vercel

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Deploy:
   ```bash
   vercel
   ```

### Deploy to Other Platforms

The built application in the `.next` folder can be deployed to any platform that supports Node.js applications.

## 🔧 Development

### Code Style

- Use TypeScript for type safety
- Follow React best practices
- Use Tailwind CSS for styling
- Implement responsive design

### Adding New Components

1. Create component in `components/` directory
2. Use TypeScript interfaces for props
3. Style with Tailwind CSS classes
4. Export from appropriate index files

## 🐛 Troubleshooting

### Common Issues

1. **Port 3000 in use**: Change port in `package.json` scripts
2. **API connection errors**: Ensure backend is running on port 8000
3. **Build errors**: Check TypeScript types and imports

### Debug Mode

Enable debug logging by setting:
```javascript
console.log('Debug mode enabled');
```

## 📄 License

This project is part of the TokByte authentication system.