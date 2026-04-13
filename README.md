# NexusExpense - Expense Tracker Application

A Firebase-powered expense tracking application built with React and Vite. Manage your expenses efficiently with advanced analytics, budgeting capabilities, and secure authentication.

## Features

### Core Functionality
- **User Authentication**: Email/password registration and login with Firebase Auth and Google Sign-In
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
- **Firebase Auth** - Authentication
- **Firestore** - Expense and profile storage
- **Firebase Storage** - Receipt uploads
- **Firebase Analytics** - Optional usage analytics

### Infrastructure
- **Git/GitHub** - Version control

## Project Structure

```
expense-tracker/
├── frontend/                 # React Vite application
│   ├── src/
│   │   ├── pages/           # Page components (Dashboard, Login, Register, etc.)
│   │   ├── components/      # Reusable UI components
│   │   ├── context/         # React Context for state management
│   │   ├── services/        # Firebase services
│   │   └── App.jsx
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
└── Firebase services        # Auth, Firestore, Storage, Analytics
```

## Installation & Setup

### Prerequisites
- Node.js and npm
- Git

### Frontend Setup

1. **Install Dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Configure Environment**
   - Firebase config is embedded in `frontend/src/services/firebase.js`
   - Update it there if you need a different Firebase project

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

1. **Start Frontend Dev Server**
   ```bash
   cd frontend
   npm run dev
   ```

2. **Access Application**
   - Navigate to `http://localhost:5173`

### User Workflow

1. **Register/Login**
   - Create new account or sign in with Google
   - Verify email through Firebase before first login

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

## Firebase Data Model

- `users/{uid}` stores profile data
- `users/{uid}/expenses/{expenseId}` stores expenses
- `users/{uid}/budgets/{YYYY-MM}` stores monthly budgets
- Firebase Storage stores receipt images under `receipts/{uid}/...`

## Security Features

- **Firebase Authentication**: Secure user sign-in and email verification
- **Firestore Security**: Data isolated per authenticated user
- **Firebase Storage**: Receipt uploads stored per user
- **Input Validation**: Client-side validation for all inputs

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

### Firebase Auth Issues
- Verify Firebase configuration in `frontend/src/services/firebase.js`
- Check Firebase Web API key and project ID
- Ensure email verification is enabled in Firebase Console

### Receipt Upload Issues
- Supported formats: JPEG, PNG, WebP
- Maximum file size: 5MB

## Support

For issues, questions, or feedback, please create an issue on GitHub or contact the developer.