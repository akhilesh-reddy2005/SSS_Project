import React, { useContext, useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import ExpenseForm from '../components/ExpenseForm';
import InstallAppButton from '../components/InstallAppButton';
import { deleteExpense as deleteExpenseDoc, getReports, listExpenses, setBudget } from '../services/firebaseData';
import { AuthContext } from '../context/AuthContext';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import {
  Wallet,
  TrendingUp,
  AlertCircle,
  Lightbulb,
  CheckCircle2,
  Info,
  Plus,
  Pencil,
  Trash2,
  Calendar,
  Loader2,
  Target,
  Search
} from 'lucide-react';

const COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6'];
const CATEGORIES = ['All', 'Food', 'Travel', 'Bills', 'Shopping', 'Others'];

const INSIGHT_ICONS = {
  warning: <AlertCircle className="w-5 h-5 text-amber-400" />,
  suggestion: <Lightbulb className="w-5 h-5 text-cyan-400" />,
  advice: <Info className="w-5 h-5 text-slate-400" />,
  info: <Info className="w-5 h-5 text-blue-400" />,
  success: <CheckCircle2 className="w-5 h-5 text-emerald-400" />
};

const INSIGHT_STYLES = {
  warning: 'bg-amber-500/10 text-amber-200 border-amber-500/20',
  suggestion: 'bg-cyan-500/10 text-cyan-200 border-cyan-500/20',
  advice: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
  info: 'bg-blue-500/10 text-blue-200 border-blue-500/20',
  success: 'bg-emerald-500/10 text-emerald-200 border-emerald-500/20'
};

const formatINR = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(Number(value) || 0);

const getMonthDateRange = (monthKey) => {
  const [year, month] = monthKey.split('-').map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10)
  };
};

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [data, setData] = useState({
    total_monthly: 0,
    category_breakdown: [],
    monthly_series: [],
    daily_series: [],
    insights: [],
    recent_transactions: [],
    budget: {
      amount: 0,
      remaining: 0,
      percentage_used: 0,
      exceeded: false
    }
  });

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingExpenses, setLoadingExpenses] = useState(true);
  const [savingBudget, setSavingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));
  const [filters, setFilters] = useState({ startDate: '', endDate: '', category: 'All', search: '' });

  useEffect(() => {
    const range = getMonthDateRange(currentMonth);
    setFilters((prev) => ({ ...prev, startDate: range.start, endDate: range.end }));
  }, [currentMonth]);

  const fetchDashboardData = async () => {
    try {
      const reportData = await getReports(user?.uid || user?.id, currentMonth);
      setData(reportData);
      setBudgetInput(reportData.budget?.amount ? String(reportData.budget.amount) : '');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchExpenses = async () => {
    setLoadingExpenses(true);
    try {
      const rows = await listExpenses(user?.uid || user?.id, filters);
      setExpenses(rows);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingExpenses(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [currentMonth]);

  useEffect(() => {
    fetchExpenses();
  }, [filters]);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      await deleteExpenseDoc(user?.uid || user?.id, id);
      fetchDashboardData();
      fetchExpenses();
    }
  };

  const handleSaveBudget = async () => {
    const amount = Number(budgetInput);
    if (!amount || amount <= 0) {
      window.alert('Please enter a valid monthly budget amount.');
      return;
    }

    setSavingBudget(true);
    try {
      await setBudget(user?.uid || user?.id, currentMonth, amount);
      fetchDashboardData();
    } catch (err) {
      window.alert(err.message || 'Failed to save budget.');
    } finally {
      setSavingBudget(false);
    }
  };


  const chartData = useMemo(
    () => data.category_breakdown.map((cat) => ({ name: cat.category, value: Number(cat.total_amount) })),
    [data.category_breakdown]
  );

  const monthlyBarData = useMemo(
    () =>
      (data.monthly_series || []).map((item) => ({
        month: item.month_key,
        amount: Number(item.total_amount)
      })),
    [data.monthly_series]
  );

  const lineTrendData = useMemo(
    () =>
      (data.daily_series || []).map((item) => ({
        day: new Date(item.day_key).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        amount: Number(item.total_amount)
      })),
    [data.daily_series]
  );

  const budget = data.budget || { amount: 0, remaining: 0, percentage_used: 0, exceeded: false };

  return (
    <div className="min-h-screen relative pt-20">
      <Navbar />

      <div className="fixed top-[20%] left-[-10%] w-[30%] h-[40%] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-600/10 blur-[120px] pointer-events-none"></div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 relative z-10 animate-fade-in-up">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-['Outfit'] text-white">Dashboard</h1>
            <p className="text-sm font-medium text-slate-400 mt-1 uppercase tracking-wider">Analytics, Budget and Reports</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <InstallAppButton className="px-4 py-2.5" />

            <div className="glass-card flex items-center px-4 py-2.5 rounded-xl cursor-default">
              <Calendar className="w-5 h-5 text-indigo-400 mr-3" />
              <input
                type="month"
                value={currentMonth}
                onChange={(e) => setCurrentMonth(e.target.value)}
                className="bg-transparent text-slate-200 outline-none text-sm font-medium w-28 cursor-pointer focus:ring-0"
                style={{ colorScheme: 'dark' }}
              />
            </div>

            <button
              onClick={() => {
                setEditingExpense(null);
                setIsFormOpen(true);
              }}
              className="btn-primary px-6 py-2.5 flex items-center shadow-indigo-500/20"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Expense
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-32 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
            <div className="text-slate-400 font-medium tracking-widest text-sm uppercase">Loading Data</div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="glass-card rounded-2xl p-6">
                <p className="text-xs font-semibold text-indigo-400 mb-2 uppercase tracking-wider">Total Monthly Spend</p>
                <h3 className="text-3xl font-bold text-white">{formatINR(data.total_monthly)}</h3>
              </div>

              <div className="glass-card rounded-2xl p-6">
                <p className="text-xs font-semibold text-cyan-400 mb-2 uppercase tracking-wider">Top Category</p>
                <h3 className="text-2xl font-bold text-white">
                  {chartData.length > 0 ? chartData.reduce((a, b) => (a.value > b.value ? a : b)).name : 'No data'}
                </h3>
              </div>

              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center mb-3">
                  <Target className="w-5 h-5 text-emerald-400 mr-2" />
                  <p className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">Monthly Budget</p>
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={budgetInput}
                    onChange={(e) => setBudgetInput(e.target.value)}
                    className="input-field"
                    placeholder="Set budget in INR"
                  />
                  <button onClick={handleSaveBudget} disabled={savingBudget} className="btn-primary px-4 py-2">
                    {savingBudget ? 'Saving...' : 'Save'}
                  </button>
                </div>
                <p className="text-sm text-slate-300 mt-3">Remaining: {formatINR(budget.remaining)}</p>
                <p className="text-sm text-slate-300">Used: {Number(budget.percentage_used || 0).toFixed(1)}%</p>
                {budget.exceeded && (
                  <p className="text-sm text-rose-400 mt-2 font-semibold">⚠️ Budget exceeded</p>
                )}
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
                <div className="w-full">
                  <label className="text-xs text-slate-400">Start Date</label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
                    className="input-field"
                  />
                </div>

                <div className="w-full">
                  <label className="text-xs text-slate-400">End Date</label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
                    className="input-field"
                  />
                </div>

                <div className="w-full">
                  <label className="text-xs text-slate-400">Category</label>
                  <select
                    value={filters.category}
                    onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value }))}
                    className="input-field"
                  >
                    {CATEGORIES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="w-full sm:col-span-2 lg:col-span-1">
                  <label className="text-xs text-slate-400">Search Description</label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={filters.search}
                      onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                      className="input-field pl-10"
                      placeholder="Search notes or description"
                    />
                  </div>
                </div>

              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="glass-panel rounded-2xl p-5 lg:col-span-1 min-h-[320px]">
                <h3 className="text-lg font-semibold text-slate-100 mb-4">Pie: Category-wise</h3>
                {chartData.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={chartData} innerRadius={45} outerRadius={85} dataKey="value" paddingAngle={4}>
                          {chartData.map((entry, index) => (
                            <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip formatter={(value) => formatINR(value)} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-slate-500">No data available</div>
                )}
              </div>

              <div className="glass-panel rounded-2xl p-5 lg:col-span-1 min-h-[320px]">
                <h3 className="text-lg font-semibold text-slate-100 mb-4">Bar: Monthly Expenses</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyBarData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="month" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <RechartsTooltip formatter={(value) => formatINR(value)} />
                      <Bar dataKey="amount" fill="#06b6d4" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="glass-panel rounded-2xl p-5 lg:col-span-1 min-h-[320px]">
                <h3 className="text-lg font-semibold text-slate-100 mb-4">Line: Spending Over Time</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={lineTrendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="day" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <RechartsTooltip formatter={(value) => formatINR(value)} />
                      <Line type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={3} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="glass-panel rounded-2xl overflow-hidden lg:col-span-2">
                <div className="px-6 py-5 border-b border-slate-700/50 bg-slate-800/30">
                  <h3 className="text-lg font-semibold font-['Outfit'] text-slate-100">Filtered Transactions</h3>
                </div>
                <div className="divide-y divide-slate-700/30 max-h-[420px] overflow-y-auto">
                  {loadingExpenses ? (
                    <div className="p-8 text-slate-400">Loading filtered expenses...</div>
                  ) : expenses.length === 0 ? (
                    <div className="p-8 text-slate-400">No expenses match your filters.</div>
                  ) : (
                    expenses.map((tx) => (
                      <div key={tx.id} className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-700/20 transition group">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-200">{tx.description || tx.category}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {new Date(tx.expense_date).toLocaleDateString('en-IN')} • {tx.category}
                          </p>
                          {tx.receipt_url && (
                            <a
                              href={tx.receipt_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-cyan-300 mt-1 inline-block underline"
                            >
                              View Receipt
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-3 self-end sm:self-auto">
                          <span className="font-mono font-bold text-slate-200 text-lg">{formatINR(tx.amount)}</span>
                          <button
                            onClick={() => {
                              setEditingExpense(tx);
                              setIsFormOpen(true);
                            }}
                            className="text-slate-400 hover:text-cyan-400 p-2 rounded-lg hover:bg-slate-700/50"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(tx.id)}
                            className="text-slate-400 hover:text-rose-400 p-2 rounded-lg hover:bg-slate-700/50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-2xl rounded-full"></div>
                <div className="flex items-center mb-6 relative z-10">
                  <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-2.5 mr-4 shadow-lg shadow-indigo-500/20">
                    <Lightbulb className="w-5 h-5 text-indigo-50 animate-pulse" />
                  </div>
                  <h3 className="text-lg font-semibold font-['Outfit'] text-slate-100">Insights</h3>
                </div>

                <div className="space-y-4 relative z-10">
                  {data.insights.length === 0 ? (
                    <div className="text-sm text-slate-400 leading-relaxed bg-slate-800/30 p-4 rounded-xl border border-slate-700/30">
                      Add more expenses to generate insights.
                    </div>
                  ) : (
                    data.insights.map((insight, idx) => (
                      <div
                        key={idx}
                        className={`p-4 rounded-xl border backdrop-blur-sm flex items-start gap-4 shadow-sm ${INSIGHT_STYLES[insight.type] || INSIGHT_STYLES.info}`}
                      >
                        <div className="mt-0.5 opacity-80">{INSIGHT_ICONS[insight.type] || INSIGHT_ICONS.info}</div>
                        <p className="text-sm font-medium leading-relaxed">{insight.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {isFormOpen && (
        <ExpenseForm
          expense={editingExpense}
          onClose={() => setIsFormOpen(false)}
          onSaved={() => {
            setIsFormOpen(false);
            fetchDashboardData();
            fetchExpenses();
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;
