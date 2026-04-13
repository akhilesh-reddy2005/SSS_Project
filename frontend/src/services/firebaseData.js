import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc
} from 'firebase/firestore';
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes
} from 'firebase/storage';
import { db, storage } from './firebase';

const USERS_COLLECTION = 'users';

export const getFirebasePermissionHelp = (error) => {
  const code = error?.code || '';
  const message = String(error?.message || '');

  if (code === 'permission-denied' || message.toLowerCase().includes('missing or insufficient permissions')) {
    return 'Firebase blocked this write. Publish Firestore and Storage rules that allow the signed-in user to access their own /users/{uid} data, and make sure Email/Password or Google sign-in is enabled in Firebase.';
  }

  return error?.message || 'Operation failed.';
};

const expenseDocRef = (uid, expenseId) => doc(db, USERS_COLLECTION, uid, 'expenses', expenseId);
const budgetDocRef = (uid, month) => doc(db, USERS_COLLECTION, uid, 'budgets', month);
const userDocRef = (uid) => doc(db, USERS_COLLECTION, uid);
const expenseCollectionRef = (uid) => collection(db, USERS_COLLECTION, uid, 'expenses');

const toISODate = (value) => {
  if (!value) return '';

  if (typeof value === 'string') {
    return value.slice(0, 10);
  }

  if (typeof value?.toDate === 'function') {
    return value.toDate().toISOString().slice(0, 10);
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return '';
};

const toNumber = (value) => Number(value) || 0;

const normalizeExpense = (snapshot) => {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    amount: toNumber(data.amount),
    category: data.category || 'Others',
    expense_date: toISODate(data.expense_date),
    description: data.description || '',
    receipt_url: data.receipt_url || '',
    receipt_path: data.receipt_path || '',
    created_at: data.created_at?.toDate ? data.created_at.toDate().toISOString() : data.created_at || '',
    updated_at: data.updated_at?.toDate ? data.updated_at.toDate().toISOString() : data.updated_at || ''
  };
};

const monthStartEnd = (monthKey) => {
  const [year, month] = monthKey.split('-').map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10)
  };
};

const isWithinRange = (dateValue, startDate, endDate) => {
  if (!dateValue) return false;
  if (startDate && dateValue < startDate) return false;
  if (endDate && dateValue > endDate) return false;
  return true;
};

const uploadReceipt = async (uid, file) => {
  if (!file) return { receipt_url: '', receipt_path: '' };

  const receiptPath = `receipts/${uid}/${Date.now()}-${file.name}`;
  const storageRef = ref(storage, receiptPath);
  await uploadBytes(storageRef, file);
  const receiptUrl = await getDownloadURL(storageRef);

  return { receipt_url: receiptUrl, receipt_path: receiptPath };
};

const deleteReceipt = async (receiptPath) => {
  if (!receiptPath) return;
  try {
    await deleteObject(ref(storage, receiptPath));
  } catch (error) {
    // Ignore missing-file errors.
  }
};

export const ensureUserProfile = async (firebaseUser) => {
  if (!firebaseUser?.uid) return null;

  const profile = {
    uid: firebaseUser.uid,
    name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
    email: firebaseUser.email || '',
    photoURL: firebaseUser.photoURL || '',
    updatedAt: serverTimestamp()
  };

  await setDoc(
    userDocRef(firebaseUser.uid),
    {
      ...profile,
      createdAt: serverTimestamp()
    },
    { merge: true }
  );

  return profile;
};

export const getUserProfile = async (uid) => {
  if (!uid) return null;
  const snapshot = await getDoc(userDocRef(uid));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  return {
    id: uid,
    uid,
    name: data.name || '',
    email: data.email || '',
    photoURL: data.photoURL || ''
  };
};

export const updateUserProfileName = async (uid, name) => {
  if (!uid) throw new Error('Missing user id.');
  const normalizedName = String(name || '').trim();
  if (!normalizedName) throw new Error('Name is required.');

  await setDoc(
    userDocRef(uid),
    {
      uid,
      name: normalizedName,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );

  return { id: uid, uid, name: normalizedName };
};

export const listExpenses = async (uid, filters = {}) => {
  if (!uid) return [];

  const snapshot = await getDocs(query(expenseCollectionRef(uid)));
  const items = snapshot.docs.map(normalizeExpense);

  const { startDate = '', endDate = '', category = 'All', search = '' } = filters;
  const searchTerm = String(search || '').trim().toLowerCase();

  return items
    .filter((item) => isWithinRange(item.expense_date, startDate, endDate))
    .filter((item) => !category || category === 'All' || item.category === category)
    .filter((item) => !searchTerm || String(item.description || '').toLowerCase().includes(searchTerm))
    .sort((a, b) => (a.expense_date === b.expense_date ? b.id.localeCompare(a.id) : b.expense_date.localeCompare(a.expense_date)));
};

export const getExpensesForMonth = async (uid, monthKey) => {
  const { start, end } = monthStartEnd(monthKey);
  return listExpenses(uid, { startDate: start, endDate: end });
};

export const saveExpense = async (uid, expense, receiptFile = null) => {
  if (!uid) throw new Error('Missing user id.');

  const normalized = {
    amount: toNumber(expense.amount),
    category: expense.category || 'Food',
    expense_date: expense.expense_date || new Date().toISOString().slice(0, 10),
    description: expense.description || '',
    updated_at: serverTimestamp()
  };

  let receiptData = { receipt_url: expense.receipt_url || '', receipt_path: expense.receipt_path || '' };
  if (receiptFile) {
    receiptData = await uploadReceipt(uid, receiptFile);
  }

  const payload = {
    ...normalized,
    ...receiptData
  };

  if (expense.id) {
    const existingSnapshot = await getDoc(expenseDocRef(uid, expense.id));
    if (!existingSnapshot.exists()) {
      throw new Error('Expense not found.');
    }

    const existingData = existingSnapshot.data();
    if (receiptFile && existingData?.receipt_path) {
      await deleteReceipt(existingData.receipt_path);
    }

    await updateDoc(expenseDocRef(uid, expense.id), payload);
    return { id: expense.id, ...payload };
  }

  const created = await addDoc(expenseCollectionRef(uid), {
    ...payload,
    created_at: serverTimestamp()
  });

  return { id: created.id, ...payload };
};

export const deleteExpense = async (uid, expenseId) => {
  if (!uid || !expenseId) return;

  const snapshot = await getDoc(expenseDocRef(uid, expenseId));
  if (snapshot.exists()) {
    const data = snapshot.data();
    if (data?.receipt_path) {
      await deleteReceipt(data.receipt_path);
    }
  }

  await deleteDoc(expenseDocRef(uid, expenseId));
};

export const getBudget = async (uid, monthKey) => {
  if (!uid || !monthKey) return { amount: 0 };
  const snapshot = await getDoc(budgetDocRef(uid, monthKey));
  if (!snapshot.exists()) return { amount: 0 };
  return { amount: toNumber(snapshot.data().amount) };
};

export const setBudget = async (uid, monthKey, amount) => {
  if (!uid || !monthKey) throw new Error('Missing user id or month.');
  const normalizedAmount = toNumber(amount);
  if (normalizedAmount <= 0) {
    throw new Error('Budget amount must be greater than zero.');
  }

  await setDoc(budgetDocRef(uid, monthKey), {
    amount: normalizedAmount,
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp()
  }, { merge: true });

  return { amount: normalizedAmount };
};

const buildInsights = (totalMonthly, categoryBreakdown) => {
  const insights = [];
  const foodItem = categoryBreakdown.find((item) => item.category === 'Food');
  const foodTotal = foodItem ? toNumber(foodItem.total_amount) : 0;

  if (totalMonthly > 0) {
    if (foodTotal / totalMonthly > 0.3) {
      insights.push({
        type: 'warning',
        message: 'Your food expenses are more than 30% of your monthly spending. You can save more by cooking at home more often.'
      });
    }

    const threshold = 30000;
    if (totalMonthly > threshold) {
      insights.push({
        type: 'suggestion',
        message: `Your monthly spending is high (above INR ${threshold}). Review non-essential expenses to cut costs.`
      });
    }

    const incomeAssumption = 50000;
    if (totalMonthly >= incomeAssumption) {
      insights.push({
        type: 'advice',
        message: 'Your expenses are close to or above a typical monthly income level. Try a strict monthly budget to increase savings.'
      });
    } else {
      insights.push({
        type: 'success',
        message: 'Great job keeping your spending in control. Consider moving the remaining balance into savings.'
      });
    }
  } else {
    insights.push({
      type: 'info',
      message: 'No expenses recorded for this month yet. Start by adding your first expense.'
    });
  }

  return insights;
};

export const getReports = async (uid, monthKey) => {
  if (!uid) {
    return {
      total_monthly: 0,
      category_breakdown: [],
      monthly_series: [],
      daily_series: [],
      insights: [],
      recent_transactions: [],
      month: monthKey,
      budget: { amount: 0, remaining: 0, percentage_used: 0, exceeded: false }
    };
  }

  const allExpenses = await listExpenses(uid, {});
  const monthExpenses = await getExpensesForMonth(uid, monthKey);
  const budget = await getBudget(uid, monthKey);

  const totalMonthly = monthExpenses.reduce((sum, item) => sum + toNumber(item.amount), 0);

  const categoryMap = new Map();
  monthExpenses.forEach((item) => {
    categoryMap.set(item.category, (categoryMap.get(item.category) || 0) + toNumber(item.amount));
  });

  const categoryBreakdown = Array.from(categoryMap.entries()).map(([category, total_amount]) => ({ category, total_amount }));

  const monthDates = [];
  const current = new Date(`${monthKey}-01T00:00:00`);
  for (let i = 5; i >= 0; i -= 1) {
    const date = new Date(current);
    date.setMonth(date.getMonth() - i);
    monthDates.push(date.toISOString().slice(0, 7));
  }

  const monthlySeries = monthDates.map((month) => ({
    month_key: month,
    total_amount: allExpenses.filter((item) => item.expense_date.startsWith(month)).reduce((sum, item) => sum + toNumber(item.amount), 0)
  }));

  const dailyMap = new Map();
  monthExpenses.forEach((item) => {
    dailyMap.set(item.expense_date, (dailyMap.get(item.expense_date) || 0) + toNumber(item.amount));
  });

  const dailySeries = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day_key, total_amount]) => ({ day_key, total_amount }));

  const insights = buildInsights(totalMonthly, categoryBreakdown);
  const recentTransactions = [...allExpenses]
    .sort((a, b) => (a.expense_date === b.expense_date ? b.id.localeCompare(a.id) : b.expense_date.localeCompare(a.expense_date)))
    .slice(0, 5);

  const percentageUsed = budget.amount > 0 ? Math.min(100, (totalMonthly / budget.amount) * 100) : 0;

  return {
    total_monthly: totalMonthly,
    category_breakdown: categoryBreakdown,
    monthly_series: monthlySeries,
    daily_series: dailySeries,
    insights,
    recent_transactions: recentTransactions,
    month: monthKey,
    budget: {
      amount: budget.amount,
      remaining: budget.amount - totalMonthly,
      percentage_used: percentageUsed,
      exceeded: budget.amount > 0 && totalMonthly > budget.amount
    }
  };
};

export const getExportRowsForMonth = async (uid, monthKey) => getExpensesForMonth(uid, monthKey);
