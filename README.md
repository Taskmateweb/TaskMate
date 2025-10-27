# TaskMate - Modern Task Management System

A beautiful, modern task management web application with clean white UI/UX design and **Firebase backend**. TaskMate helps you organize your work, manage tasks efficiently, and boost your productivity with real-time data synchronization.

![TaskMate](src/img/logo.png)

## ✨ Features

### 🔐 Authentication System (Firebase Auth)
- **User Registration** - Create new accounts with email and password
- **Secure Login** - Firebase Authentication with remember me functionality
- **Password Validation** - Minimum 8 characters requirement
- **Session Management** - Persistent login sessions across devices
- **Real-time Auth** - Instant authentication state updates

### 🗄️ Cloud Database (Firestore)
- **Real-time Sync** - Changes sync instantly across all devices
- **Secure Storage** - Data stored in Google's Firebase Firestore
- **User Isolation** - Each user's data is completely private
- **Offline Support** - Works offline, syncs when back online

### 📋 Task Management
- **Create Tasks** - Add new tasks with titles, descriptions, due dates, and priorities
- **Edit Tasks** - Modify existing tasks
- **Delete Tasks** - Remove completed or unnecessary tasks
- **Task Status** - Track tasks through different states (To Do, In Progress, Completed)
- **Priority Levels** - Set task priorities (High, Medium, Low)

### 📂 List Organization
- **Multiple Lists** - Organize tasks into categories:
  - Personal, Work, Shopping, Ideas, Travel
  - Movies, Books, Music, Fitness, Finance
  - Home, Projects, Events, Goals, Habits, Routines
- **Custom Lists** - Create your own custom task lists

### ⏱️ Focus Sessions
- **Pomodoro Timer** - Focus on specific tasks with timed work sessions
- **Task Selection** - Choose which task to focus on
- **Productivity Boost** - Minimize distractions with dedicated focus mode

### 🎨 Modern UI/UX Design
- **Clean White Design** - Beautiful, minimalist interface
- **Responsive Layout** - Works perfectly on desktop, tablet, and mobile
- **Smooth Animations** - Polished transitions and interactions
- **Gradient Backgrounds** - Subtle gray-to-blue gradients
- **Card-Based Interface** - Modern card design for all components

## 🚀 Getting Started

### Prerequisites
- Web browser (Chrome, Firefox, Safari, Edge)
- Node.js and npm (for development)
- **Firebase account** (free tier available)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Taskmateweb/TaskMate.git
   cd TaskMate
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Firebase** (IMPORTANT!)
   - Follow the detailed guide in [FIREBASE_SETUP.md](FIREBASE_SETUP.md)
   - Create a Firebase project
   - Enable Authentication (Email/Password)
   - Create Firestore Database
   - Copy your Firebase config to `src/js/firebase-config.js`

4. **Build the CSS**
   ```bash
   npm run build
   ```

5. **Open in browser**
   - Simply open `index.html` in your web browser
   - Or use a local server like Live Server in VS Code

### Development Mode

To run Tailwind CSS in watch mode during development:
```bash
npm run dev
```

This will automatically rebuild the CSS when you make changes to your HTML or JavaScript files.

## 📁 Project Structure

```
TaskMate/
├── index.html              # Landing page
├── login.html              # Login page
├── register.html           # Registration page
├── dashboard.html          # Main dashboard
├── about.html              # About page
├── contact.html            # Contact page
├── privacy.html            # Privacy policy
├── terms.html              # Terms of service
├── src/
│   ├── css/
│   │   ├── input.css       # Tailwind source
│   │   └── style.css       # Compiled CSS
│   ├── js/
│   │   ├── app.js          # Main application logic
│   │   └── auth.js         # Authentication logic
│   └── img/                # Images and assets
├── tailwind.config.js      # Tailwind configuration
├── postcss.config.js       # PostCSS configuration
└── package.json            # Dependencies
```

## 🔧 Technologies Used

- **HTML5** - Semantic markup
- **Tailwind CSS v4.1** - Utility-first CSS framework
- **Vanilla JavaScript** - ES6 modules
- **Firebase v10.7** - Backend services
  - **Firebase Authentication** - User management
  - **Cloud Firestore** - NoSQL database
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixing

## 💾 Data Storage

TaskMate uses **Firebase Firestore** to store:
- User accounts (managed by Firebase Auth)
- Tasks with all properties
- Custom lists
- User preferences

### Data Structure

**Users Collection** (`/users/{userId}`)
```javascript
{
  name: "John Doe",
  email: "john@example.com",
  createdAt: timestamp,
  updatedAt: timestamp
}
```

**Tasks Collection** (`/tasks/{taskId}`)
```javascript
{
  userId: "user123",
  title: "Complete project",
  description: "Finish the final report",
  list: "Work",
  due: "Tomorrow",
  priority: "High",
  status: "In Progress",
  createdAt: timestamp,
  updatedAt: timestamp
}
```

**Lists Collection** (`/lists/{listId}`)
```javascript
{
  userId: "user123",
  name: "Custom List Name",
  createdAt: timestamp
}
```

**Benefits:**
- ✅ Data synced across devices
- ✅ Real-time updates
- ✅ Secure with Firestore rules
- ✅ Automatic backups
- ✅ Scalable infrastructure

## 🎯 Usage

### Creating an Account

1. Click "Get Started" or "Login" on the homepage
2. Navigate to the registration page
3. Fill in your full name, email, and password
4. Accept the terms and conditions
5. Click "Create Account"

### Logging In

1. Go to the login page
2. Enter your email and password
3. Optionally check "Remember me"
4. Click "Sign In"

### Managing Tasks

1. After logging in, you'll see the dashboard
2. Click "Add Task" to create a new task
3. Fill in the task details (title, list, due date, priority, description)
4. Tasks appear in the table where you can:
   - View details
   - Edit properties
   - Mark as complete
   - Delete tasks

### Using Focus Sessions

1. Click on the "Start a Focus Session" card
2. Select a task from the dropdown
3. Set the duration (in minutes)
4. Click "Start Focus" to begin
5. Work on your task until the timer completes

## 🎨 Color Scheme

- **Primary Blue**: `#3B82F6` (blue-600)
- **Background**: White with subtle gradients
- **Text**: Gray-800 for primary text
- **Borders**: Gray-100 to Gray-300
- **Accents**: Blue gradients for interactive elements

## 📱 Responsive Design

TaskMate is fully responsive and works on:
- 📱 Mobile phones (320px+)
- 📱 Tablets (768px+)
- 💻 Laptops (1024px+)
- 🖥️ Desktops (1280px+)

## 🔒 Security Notes

**Firebase Security Features:**
- ✅ Server-side authentication
- ✅ Secure password hashing (handled by Firebase)
- ✅ HTTPS/SSL encryption (automatic with Firebase)
- ✅ Firestore security rules (user data isolation)
- ✅ CSRF protection (built into Firebase)

**Firestore Security Rules ensure:**
- Users can only read/write their own data
- Authentication required for all operations
- Data validation at the database level

See [FIREBASE_SETUP.md](FIREBASE_SETUP.md) for complete security configuration.

## 🚧 Future Enhancements

- [ ] Social authentication (Google, Facebook OAuth)
- [ ] Email verification
- [ ] Password reset functionality
- [ ] Task sharing and collaboration
- [ ] Calendar integration
- [ ] Push notifications (Firebase Cloud Messaging)
- [ ] Task reminders with scheduling
- [ ] Data export/import (JSON, CSV)
- [ ] Dark mode theme
- [ ] Progressive Web App (PWA)
- [ ] Mobile apps (React Native/Flutter)
- [ ] Task attachments (Firebase Storage)
- [ ] Real-time collaboration features

## 📄 License

This project is licensed under the ISC License.

## 👥 Author

**Taskmateweb**
- GitHub: [@Taskmateweb](https://github.com/Taskmateweb)
- Repository: [TaskMate](https://github.com/Taskmateweb/TaskMate)

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 Support

If you have any questions or need help, please open an issue in the GitHub repository.

---

**Made with ❤️ by Taskmateweb**

*Organize your work, Simplify your life*
