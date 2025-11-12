# ScrumFlow 📋

A modern, full-stack project management application built with React, TypeScript, and Express.js. ScrumFlow provides Kanban-style task management with real-time collaboration features, perfect for agile teams and project organization.

![ScrumFlow](https://img.shields.io/badge/ScrumFlow-Project%20Management-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-43853D?logo=node.js&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-00000F?logo=mysql&logoColor=white)

## 🚀 Features

### 📊 Project Management
- **Kanban Board**: Drag-and-drop task management with customizable columns
- **Project Collaboration**: Multi-user project access with role-based permissions
- **Task Assignment**: Assign tasks to specific team members
- **Focus System**: Daily focus task highlighting for better productivity
- **Wishlist Management**: Convert ideas and feature requests into actionable projects

### 👥 Team Collaboration
- **Real-time Notifications**: Instant updates for team activities
- **Project Members**: Owner/Admin/Member role hierarchy
- **User Management**: Comprehensive admin panel for user administration
- **Admin Impersonation**: Admins can view and manage on behalf of users

### 🎨 User Experience
- **Modern UI**: Built with TailwindCSS and Radix UI components
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Dark/Light Mode**: Theme support for user preferences
- **Quick Notes**: Contextual sticky notes for projects and dashboard
- **Dashboard Widgets**: Overview of tasks, projects, and reminders

### 🔐 Security & Authentication
- **Session-based Authentication**: Secure login with persistent sessions
- **Role-based Access Control**: Admin and user permission levels
- **CSRF Protection**: Security measures against cross-site attacks
- **Password Management**: Secure credential handling

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **TailwindCSS** for styling
- **Radix UI** for accessible components
- **TanStack Query** for state management
- **Wouter** for lightweight routing
- **Framer Motion** for animations

### Backend
- **Express.js** with TypeScript
- **MySQL/MariaDB** database
- **Express Sessions** for authentication
- **Drizzle ORM** for database operations
- **Zod** for data validation
- **WebSocket** support for real-time features

### Infrastructure
- **AWS RDS** for production database
- **Node-Windows** for Windows service deployment
- **PM2** for process management
- **File-based session storage** for persistence

## 📦 Installation

### Prerequisites
- Node.js (v18 or higher)
- MySQL/MariaDB database
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/JensenPadillaFigueroa/scrumflow.git
cd scrumflow
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory:
```env
# Database Configuration
DB_HOST=your-database-host
DB_PORT=3306
DB_USER=your-username
DB_PASSWORD=your-password
DB_NAME=scrumflow

# Application Configuration
PORT=3008
NODE_ENV=development
SESSION_SECRET=your-session-secret
```

### 4. Database Setup
Run the database migrations:
```bash
npm run db:push
```

### 5. Build the Application
```bash
npm run build
```

### 6. Start the Application
```bash
# Development mode
npm run dev

# Production mode
npm start
```

The application will be available at `http://localhost:3008`

## 🔧 Development

### Available Scripts
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run check` - TypeScript type checking
- `npm run db:push` - Push database schema changes

### Project Structure
```
scrumflow/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Application pages
│   │   ├── hooks/          # Custom React hooks
│   │   └── lib/            # Utilities and configurations
│   └── public/             # Static assets
├── server/                 # Express.js backend
│   ├── routes/             # API route handlers
│   ├── migrations/         # Database migrations
│   └── index.ts            # Server entry point
├── shared/                 # Shared types and schemas
└── migrations/             # SQL migration files
```

## 🗄️ Database Schema

### Core Tables
- **users**: User management with role-based access
- **projects**: Project containers with ownership
- **project_members**: Many-to-many project collaboration
- **tasks**: Kanban-style tasks with status tracking
- **wishlist_items**: Feature requests and ideas
- **reminders**: Priority-based reminder system
- **quick_notes**: Contextual sticky notes
- **notifications**: Real-time notification system

### Task Status Flow
```
wishlist → todo → in_progress → done
```

## 🔌 API Endpoints

### Authentication
- `POST /api/login` - User authentication
- `POST /api/logout` - User logout
- `GET /api/session` - Session validation

### Projects
- `GET /api/projects` - List user projects
- `POST /api/projects` - Create new project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Tasks
- `GET /api/tasks` - List tasks (with filters)
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

### Admin
- `GET /api/admin/users` - List all users (admin only)
- `POST /api/admin/users` - Create user (admin only)
- `POST /api/admin/impersonate` - Impersonate user (admin only)

## 🚀 Deployment

### Windows Service Deployment
For production deployment as a Windows service:

1. Build the application:
```bash
npm run build
```

2. Install as Windows service:
```bash
node install-service.cjs
```

3. Manage the service:
```bash
# Start service
net start ScrumFlow3008

# Stop service
net stop ScrumFlow3008
```

### Manual Deployment
For manual deployment with PM2:
```bash
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

## 👤 Default Users


## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Jensen Padilla Figueroa**
- GitHub: [@JensenPadillaFigueroa](https://github.com/JensenPadillaFigueroa)
- Email: jpadilla@tekpropr.com

## 🙏 Acknowledgments

- Built with modern web technologies
- Inspired by agile project management methodologies
- Designed for team collaboration and productivity

---

⭐ If you find this project useful, please consider giving it a star on GitHub!
