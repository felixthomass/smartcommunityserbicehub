# Smart Community Hub

A comprehensive community management system built with React, Vite, Tailwind CSS, and Supabase. Features complete authentication, authorization, and role-based access control.

## 🚀 Features

### Authentication & Authorization
- **Multi-provider Authentication**: Email/password and Google OAuth
- **Role-based Access Control**: Resident, Admin, Staff, Security roles
- **Protected Routes**: Automatic redirection based on authentication status
- **Session Management**: Persistent sessions with automatic refresh
- **User Profile Management**: Complete profile editing capabilities

### User Management
- **Admin Dashboard**: Manage all community members
- **Role Assignment**: Change user roles and permissions
- **User Search & Filter**: Find users by name, email, or role
- **Profile Management**: View and edit user information

### Community Features
- **Dashboard**: Role-specific dashboards for different user types
- **Notifications**: Real-time notification system
- **Maintenance Requests**: Submit and track maintenance issues
- **Visitor Management**: Generate and manage visitor passes
- **Complaints System**: Submit and track community complaints
- **Announcements**: Community-wide announcements

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Authentication**: Supabase Auth with Google OAuth
- **Database**: PostgreSQL with Row Level Security
- **Styling**: Tailwind CSS with Dark Mode
- **Icons**: Lucide React
- **State Management**: React Context API

## 📋 Prerequisites

- Node.js 16+ 
- npm or yarn
- Supabase account
- Google Cloud Console account (for OAuth)

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd community-service
npm install
```

### 2. Set Up Supabase

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Get your project URL and anon key from Settings → API
3. Create a `.env.local` file:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Configure Database

1. Go to your Supabase dashboard → SQL Editor
2. Run the complete SQL schema from `SUPABASE_SETUP.md`
3. This creates all necessary tables, policies, and functions

### 4. Set Up Google OAuth

1. Create a Google OAuth app in Google Cloud Console
2. Configure Supabase Google provider
3. Add redirect URIs (see `SUPABASE_SETUP.md` for details)

### 5. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:5173` to see your application!

## 🏗️ Project Structure

```
src/
├── components/
│   ├── dashboards/          # Role-specific dashboards
│   ├── Login.jsx           # Authentication component
│   ├── LandingPage.jsx     # Landing page
│   ├── Navigation.jsx      # Main navigation
│   ├── ProtectedRoute.jsx  # Route protection
│   ├── UserProfile.jsx     # User profile management
│   └── AdminUserManagement.jsx # Admin user management
├── contexts/
│   ├── AuthContext.jsx     # Authentication context
│   └── ThemeContext.jsx    # Dark mode context
├── lib/
│   └── supabase.js         # Supabase client configuration
└── App.jsx                 # Main application component
```

## 🔐 Authentication Flow

1. **Landing Page**: Users can choose to sign in or register
2. **Login/Register**: Email/password or Google OAuth
3. **Role Assignment**: New users get 'resident' role by default
4. **Dashboard Redirect**: Users are redirected to role-specific dashboard
5. **Session Persistence**: Sessions are maintained across browser restarts

## 👥 User Roles & Permissions

### Resident
- View and edit own profile
- Submit maintenance requests
- Generate visitor passes
- Submit complaints
- View community announcements

### Admin/Owner
- All resident permissions
- Manage all users (view, edit, delete)
- Change user roles
- View all maintenance requests
- Manage complaints
- Create announcements
- Access settings

### Staff
- View assigned maintenance tasks
- Update task status
- View own profile
- Access maintenance dashboard

### Security
- View visitor passes
- Check in/out visitors
- View security dashboard
- Access visitor logs

## 🗄️ Database Schema

The application uses the following main tables:

- **profiles**: User information and roles
- **notifications**: User notifications
- **maintenance_requests**: Maintenance requests and tasks
- **visitor_passes**: Visitor management
- **complaints**: Community complaints
- **announcements**: Community announcements

All tables have Row Level Security (RLS) enabled with appropriate policies.

## 🔒 Security Features

- **Row Level Security**: Database-level access control
- **Role-based Authorization**: Frontend and backend role checks
- **Protected Routes**: Automatic redirection for unauthorized access
- **Session Management**: Secure session handling
- **Input Validation**: Form validation and sanitization
- **Error Handling**: Comprehensive error handling and user feedback

## 🎨 UI/UX Features

- **Responsive Design**: Works on all device sizes
- **Dark Mode**: Toggle between light and dark themes
- **Loading States**: Visual feedback during operations
- **Error Messages**: Clear error communication
- **Success Feedback**: Confirmation of successful actions
- **Accessibility**: WCAG compliant design

## 🚀 Deployment

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm run preview
```

### Environment Variables for Production
```env
VITE_SUPABASE_URL=your_production_supabase_url
VITE_SUPABASE_ANON_KEY=your_production_anon_key
```

## 📱 Mobile Support

The application is fully responsive and works on:
- Desktop browsers
- Tablets
- Mobile phones
- Progressive Web App (PWA) ready

## 🔧 Configuration

### Supabase Configuration
- Database schema in `SUPABASE_SETUP.md`
- Authentication settings in Supabase dashboard
- Email templates customization
- OAuth provider setup

### Environment Variables
- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anon key

## 🐛 Troubleshooting

### Common Issues

1. **Authentication Not Working**
   - Check environment variables
   - Verify Supabase configuration
   - Check browser console for errors

2. **Database Errors**
   - Ensure all SQL schema is executed
   - Check RLS policies
   - Verify table structure

3. **Google OAuth Issues**
   - Verify redirect URIs
   - Check Google Cloud Console settings
   - Ensure Supabase Google provider is enabled

### Getting Help

1. Check the `SUPABASE_SETUP.md` for detailed setup instructions
2. Review browser console for error messages
3. Check Supabase dashboard logs
4. Verify all environment variables are set correctly

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [Supabase](https://supabase.com) for the backend infrastructure
- [Tailwind CSS](https://tailwindcss.com) for styling
- [Lucide React](https://lucide.dev) for icons
- [Vite](https://vitejs.dev) for the build tool

## 📞 Support

For support and questions:
1. Check the documentation
2. Review the setup guide
3. Check existing issues
4. Create a new issue with detailed information

---

**Happy coding! 🎉**
