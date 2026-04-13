import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { X, Loader2, Save } from 'lucide-react';

const ExpenseForm = ({ expense, onClose, onSaved }) => {
  const [formData, setFormData] = useState({
    amount: '',
    category: 'Food',
    expense_date: new Date().toISOString().split('T')[0],
    description: ''
  });
  const [receiptFile, setReceiptFile] = useState(null);
  const [existingReceiptUrl, setExistingReceiptUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (expense) {
      setFormData({
        id: expense.id,
        amount: expense.amount,
        category: expense.category,
        expense_date: expense.expense_date,
        description: expense.description || ''
      });
      setExistingReceiptUrl(expense.receipt_url || '');
    } else {
      setExistingReceiptUrl('');
    }
    setReceiptFile(null);
  }, [expense]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (receiptFile) {
        const payload = new FormData();
        Object.entries(formData).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            payload.append(key, value);
          }
        });
        payload.append('receipt', receiptFile);

        if (expense) {
          payload.append('_method', 'PUT');
          await api.post('/expenses.php', payload, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        } else {
          await api.post('/expenses.php', payload, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        }
      } else {
        if (expense) {
          await api.put('/expenses.php', formData);
        } else {
          await api.post('/expenses.php', formData);
        }
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save expense.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in-up" style={{ animationDuration: '0.3s' }}>
      <div className="bg-slate-900 border border-slate-700/60 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] w-full max-w-md overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-cyan-500"></div>
        
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-800 bg-slate-900/50">
          <h3 className="text-xl font-bold font-['Outfit'] text-white tracking-wide">
            {expense ? 'Edit Expense' : 'Add Expense'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white hover:bg-slate-800 p-2 rounded-lg transition-colors focus:outline-none">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
             <div className="bg-rose-500/10 text-rose-400 p-4 rounded-xl text-sm font-medium border border-rose-500/20 flex items-center">
              <span className="mr-2">⚠️</span> {error}
            </div>
          )}
          
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Amount (INR)</label>
            <input
              type="number"
              name="amount"
              step="0.01"
              required
              value={formData.amount}
              onChange={handleChange}
              className="input-field text-lg font-mono tracking-wider"
              placeholder="0.00"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="input-field appearance-none cursor-pointer"
              >
                <option value="Food">Food</option>
                <option value="Travel">Travel</option>
                <option value="Bills">Bills</option>
                <option value="Shopping">Shopping</option>
                <option value="Others">Others</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Date</label>
              <input
                type="date"
                name="expense_date"
                required
                value={formData.expense_date}
                onChange={handleChange}
                className="input-field cursor-pointer font-mono text-sm"
                style={{ colorScheme: 'dark' }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Notes</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="2"
              className="input-field resize-none"
              placeholder="Add a short note (optional)"
            ></textarea>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Receipt Image (optional)</label>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
              className="input-field file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-3 file:py-2 file:text-white file:cursor-pointer"
            />
            {existingReceiptUrl && !receiptFile && (
              <a href={existingReceiptUrl} target="_blank" rel="noreferrer" className="text-xs text-cyan-300 mt-2 inline-block underline">
                View current receipt
              </a>
            )}
          </div>

          <div className="pt-4 flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary px-6 py-3"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary px-8 py-3 flex items-center shadow-indigo-500/20"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExpenseForm;
