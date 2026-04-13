import React, { useContext, useState } from 'react';
import { X, User, Save, Download } from 'lucide-react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const UserProfileModal = ({ user, onClose }) => {
  const { updateProfileName } = useContext(AuthContext);
  const [name, setName] = useState(user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [exportMonth, setExportMonth] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!user) return null;

  const getDateRangeFromMonth = (monthKey) => {
    const [year, month] = monthKey.split('-').map(Number);
    const start = new Date(year, month - 1, 1).toISOString().slice(0, 10);
    const end = new Date(year, month, 0).toISOString().slice(0, 10);
    return { start, end };
  };

  const handleSaveName = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim()) {
      setError('Name cannot be empty.');
      return;
    }

    setSavingName(true);
    try {
      await updateProfileName(name.trim());
      setSuccess('Name updated successfully.');
    } catch (err) {
      setError(err.message || 'Unable to update name.');
    } finally {
      setSavingName(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth.php?action=change_password', {
        currentPassword,
        newPassword
      });

      if (response.data.status === 'success') {
        setSuccess(response.data.message || 'Password changed successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setError(response.data.message || 'Unable to change password.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to change password.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyExpenses = async () => {
    const { start, end } = getDateRangeFromMonth(exportMonth);
    const response = await api.get(`/expenses.php?start_date=${start}&end_date=${end}`);
    if (response.data.status !== 'success') {
      throw new Error('Unable to fetch expenses for export.');
    }
    return response.data.data || [];
  };

  const exportToPDF = async () => {
    setError('');
    setSuccess('');
    setExporting(true);
    try {
      const rows = await fetchMonthlyExpenses();
      const doc = new jsPDF();
      doc.setFontSize(14);
      doc.text(`Expense Report (${exportMonth})`, 14, 14);

      autoTable(doc, {
        startY: 22,
        head: [['Date', 'Category', 'Description', 'Amount (INR)']],
        body: rows.map((item) => [
          new Date(item.expense_date).toLocaleDateString('en-IN'),
          item.category,
          item.description || '-',
          Number(item.amount).toFixed(2)
        ])
      });

      doc.save(`expense-report-${exportMonth}.pdf`);
      setSuccess('PDF exported successfully.');
    } catch (err) {
      setError(err.message || 'Unable to export PDF.');
    } finally {
      setExporting(false);
    }
  };

  const exportToExcel = async () => {
    setError('');
    setSuccess('');
    setExporting(true);
    try {
      const rows = await fetchMonthlyExpenses();
      const sheetRows = rows.map((item) => ({
        Date: new Date(item.expense_date).toLocaleDateString('en-IN'),
        Category: item.category,
        Description: item.description || '-',
        Amount_INR: Number(item.amount).toFixed(2)
      }));

      const worksheet = XLSX.utils.json_to_sheet(sheetRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Expenses');
      XLSX.writeFile(workbook, `expense-report-${exportMonth}.xlsx`);
      setSuccess('Excel exported successfully.');
    } catch (err) {
      setError(err.message || 'Unable to export Excel.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-700/60 rounded-2xl w-full max-w-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <h3 className="text-xl font-bold font-['Outfit'] text-white">Profile & Tools</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {error && <div className="bg-rose-500/10 text-rose-400 px-3 py-2 rounded-lg text-sm border border-rose-500/20">{error}</div>}
          {success && <div className="bg-emerald-500/10 text-emerald-400 px-3 py-2 rounded-lg text-sm border border-emerald-500/20">{success}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <form onSubmit={handleSaveName} className="bg-slate-800/40 border border-slate-700 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-slate-200 font-semibold">
                <User className="w-4 h-4 text-cyan-400" />
                Basic Info
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field"
                  maxLength={100}
                />
              </div>
              <div className="text-sm text-slate-300 break-all">{user.email}</div>
              <div className="text-xs text-slate-500">User ID: {user.id}</div>
              <button type="submit" disabled={savingName} className="btn-primary w-full py-2.5 flex items-center justify-center">
                <Save className="w-4 h-4 mr-2" />
                {savingName ? 'Saving...' : 'Save Name'}
              </button>
            </form>

            <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-slate-200 font-semibold">
                <Download className="w-4 h-4 text-indigo-400" />
                Export Reports
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Month</label>
                <input
                  type="month"
                  value={exportMonth}
                  onChange={(e) => setExportMonth(e.target.value)}
                  className="input-field"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={exportToPDF} disabled={exporting} className="btn-secondary py-2.5">
                  PDF
                </button>
                <button type="button" onClick={exportToExcel} disabled={exporting} className="btn-secondary py-2.5">
                  Excel
                </button>
              </div>
            </div>
          </div>

          <div className="border border-slate-700 rounded-xl p-4 bg-slate-800/30">
            <h4 className="text-slate-100 font-semibold mb-3">Change Password</h4>

            <form onSubmit={handleChangePassword} className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Current Password</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="input-field"
                  placeholder="Current"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input-field"
                  placeholder="At least 6"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Confirm Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field"
                  placeholder="Confirm"
                />
              </div>

              <div className="md:col-span-3">
                <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 font-medium mt-2">
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;
