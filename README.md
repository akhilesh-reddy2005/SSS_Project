# NexusExpense - Expense Tracker Application

A full-stack expense tracking application built with React, Vite, and PHP. Manage your expenses efficiently with advanced analytics, budgeting capabilities, and secure authentication.

## Features

### Core Functionality
- **User Authentication**: Email/password registration and login with Firebase Google Sign-In integration
- **Expense Management**: Create, edit, and delete expenses with categories
- **Receipt Upload**: Upload and store receipt images for each expense
- **Smart Filtering**: Filter expenses by date range, category, and description search
- **Real-time Dashboard**: View expenses with responsive mobile-friendly interface

### Advanced Analytics
- **Category Breakdown**: Pie chart showing expense distribution by category
- **Monthly Trends**: Bar chart showing spending patterns over months
- **Daily Series**: Line chart tracking daily expense trends
- **Budget Management**: Set monthly budgets and track spending against them
- **Smart Insights**: AI-powered spending insights and alerts
- **INR Formatting**: All currency displayed in Indian Rupees (₹)

### User Profile & Account Management
- **Profile Modal**: View and edit user profile with name customization
- **Forgotten Password**: Reset password via email verification
- **Change Password**: Update password from profile settings
- **Real-time Clock**: IST date and time display in navbar
- **Export Features**: Download expense reports as PDF or Excel

## Tech Stack

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **Recharts** - Data visualization
- **Firebase Auth** - Authentication
- **Lucide Icons** - Icon library
- **jsPDF & xlsx** - Export functionality

### Backend
- **PHP** - Server-side language
- **PDO** - Database access layer
- **MySQL** - Database
- **Firebase Identity Toolkit** - Token verification

### Infrastructure
- **XAMPP** - Local development environment
- **Git/GitHub** - Version control

## Project Structure

```
expense-tracker/
├── frontend/                 # React Vite application
│   ├── src/
│   │   ├── pages/           # Page components (Dashboard, Login, Register, etc.)
│   │   ├── components/      # Reusable UI components
│   │   ├── context/         # React Context for state management
│   │   ├── services/        # API and Firebase services
│   │   └── App.jsx
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
├── backend/                  # PHP API
│   ├── api/
│   │   ├── auth.php         # Authentication endpoints
│   │   ├── expenses.php     # Expense CRUD operations
│   │   └── reports.php      # Analytics and reporting
│   └── config/
│       ├── db.php           # Database connection
│       └── firebase.php     # Firebase configuration
└── database.sql             # SQL schema and migrations
```

## Installation & Setup

### Docker Deployment (Recommended)

1. **Create Docker env file**
   - Copy `.env.docker.example` to `.env` in project root.
   - Fill Firebase values and adjust DB credentials if needed.

2. **Start all services**
   ```bash
   docker compose up -d --build
   ```

3. **Access the app**
   - Frontend: `http://localhost:8080`
   - Backend API: `http://localhost:10000/api`
   - MySQL host from local machine: `127.0.0.1:3307`

4. **Stop services**
   ```bash
   docker compose down
   ```

5. **Reset containers + DB volume**
   ```bash
   docker compose down -v
   docker compose up -d --build
   ```

6. **View logs**
   ```bash
   docker compose logs -f backend
   docker compose logs -f frontend
   docker compose logs -f db
   ```

7. **Production notes**
   - Do not use default DB passwords.
   - Keep `.env` secrets private.
   - Set `FRONTEND_URL` to your real frontend domain.
   - Set `VITE_API_BASE_URL` to your public backend API URL.
   - Current receipt uploads are stored on local volume (`backend/uploads`).

### Prerequisites
- XAMPP (includes Apache, PHP, MySQL)
- Node.js and npm
- Git

### Backend Setup

1. **Create MySQL Database**
   ```sql
   CREATE DATABASE expense_tracker;
   ```

2. **Import Schema**
   ```bash
   mysql -u root -p expense_tracker < database.sql
   ```

3. **Configure Database** (if needed)
   - Edit `backend/config/db.php`
   - Update `$host`, `$db`, `$user`, `$pass` as needed

4. **Firebase Configuration** (Optional)
   - Copy `backend/config/firebase.local.example.php` to `backend/config/firebase.local.php`
   - Add your Firebase Web API key

### Frontend Setup

1. **Install Dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Configure Environment**
   - Copy `.env.example` to `.env`
   - Add your Firebase configuration:
     ```bash
     VITE_FIREBASE_API_KEY=your_key
     VITE_FIREBASE_PROJECT_ID=your_project
     # ... other Firebase config
     ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Build for Production**
   ```bash
   npm run build
   ```

## Usage

### Running Locally

1. **Start XAMPP**
   - Open XAMPP Control Panel
   - Start Apache and MySQL

2. **Start Frontend Dev Server**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Access Application**
   - Navigate to `http://localhost:5173`
   - The frontend will make API calls to `http://localhost/expense-tracker/backend/api`

### User Workflow

1. **Register/Login**
   - Create new account or sign in with Google
   - Verify email through Firebase (if using Google Sign-In)

2. **Add Expense**
   - Click "Add Expense" button
   - Fill in amount, category, date, description
   - Optionally upload receipt image
   - Submit

3. **Manage Expenses**
   - View all expenses in dashboard
   - Filter by date range, category, or search description
   - Edit or delete existing expenses
   - Click "View Receipt" to see uploaded images

4. **View Analytics**
   - Dashboard displays charts for spending trends
   - View budget status and insights
   - See category-wise breakdown

5. **Profile & Export**
   - Click profile button in navbar
   - Edit name or change password
   - Export expenses as PDF or Excel
   - View reset password and logout options

## API Endpoints

### Authentication
- `POST /auth.php?action=register` - Register new user
- `POST /auth.php?action=login` - Login with email/password
- `POST /auth.php?action=google` - Google Sign-In
- `GET /auth.php?action=me` - Get current user
- `POST /auth.php?action=logout` - Logout
- `POST /auth.php?action=forgot_password` - Request password reset
- `POST /auth.php?action=reset_password` - Reset password with token
- `POST /auth.php?action=change_password` - Change password
- `POST /auth.php?action=update_profile` - Update user profile

### Expenses
- `GET /expenses.php` - Get all expenses (with filters)
- `POST /expenses.php` - Create expense (with receipt upload)
- `PUT /expenses.php?id=X` - Update expense
- `DELETE /expenses.php?id=X` - Delete expense

### Reports
- `GET /reports.php` - Get analytics data
- `POST /reports.php?action=set_budget` - Set monthly budget

## Database Schema

### Users Table
- `id` - Primary key
- `name` - User full name
- `email` - Email address (unique)
- `password` - Hashed password
- `firebase_uid` - Firebase user ID
- `created_at` - Registration timestamp

### Expenses Table
- `id` - Primary key
- `user_id` - Foreign key to users
- `amount` - Expense amount (decimal)
- `category` - Category enum (Food, Travel, Bills, Shopping, Others)
- `expense_date` - Date of expense
- `description` - Optional notes
- `receipt_path` - Path to uploaded receipt image
- `created_at` - Creation timestamp

### Budgets Table
- `id` - Primary key
- `user_id` - Foreign key to users
- `budget_month` - Month in YYYY-MM format
- `amount` - Monthly budget amount
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

## Security Features

- **Session-Based Authentication**: Secure PHP sessions for logged-in users
- **Password Hashing**: bcrypt for secure password storage
- **CORS Configuration**: Proper CORS headers for API security
- **Firebase Token Verification**: Backend verification of Firebase ID tokens
- **SQL Injection Prevention**: Prepared statements via PDO
- **Input Validation**: Server-side validation for all inputs

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Author

**Akhilesh Reddy**
- GitHub: [@akhilesh-reddy2005](https://github.com/akhilesh-reddy2005)
- Repository: [SSS_Project](https://github.com/akhilesh-reddy2005/SSS_Project)

## Troubleshooting

### Database Connection Error
- Ensure MySQL is running in XAMPP
- Verify database credentials in `backend/config/db.php`
- Check that `expense_tracker` database exists

### CORS Issues
- API CORS headers are configured in `backend/config/db.php`
- Ensure frontend is accessing backend with correct base URL

### Firebase Auth Issues
- Verify Firebase configuration in `.env`
- Check Firebase Web API key and project ID
- Ensure email verification is enabled in Firebase Console

### Receipt Upload Issues
- Ensure `backend/uploads/receipts/` directory exists and is writable
- Supported formats: JPEG, PNG, WebP
- Maximum file size: 5MB (configurable)

## Support

For issues, questions, or feedback, please create an issue on GitHub or contact the developer.