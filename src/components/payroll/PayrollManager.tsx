import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  DollarSign,
  Calendar,
  CheckCircle2,
  Clock,
  Printer,
  FileText,
  Download,
  Filter,
  Users,
  Search,
  Sparkles,
  CreditCard,
  Building,
  Edit2,
  X
} from 'lucide-react';
import { PayrollRecord } from '../../types';

export const PayrollManager: React.FC = () => {
  const {
    payroll,
    staff,
    schools,
    activeSchoolId,
    activeAcademicYear,
    addPayrollRecord,
    updatePayrollRecord,
    generateMonthlyPayroll,
    confirmPayrollReceipt,
    confirmAllSchoolPayroll,
    currentUser,
  } = useApp();

  const isHT = currentUser?.role === 'head_teacher';
  const isOperator = currentUser?.role === 'operator';

  const [selectedMonth, setSelectedMonth] = useState('2026-10');
  const [schoolFilter, setSchoolFilter] = useState(activeSchoolId !== 'all' ? activeSchoolId : 'all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Payslip modal state
  const [viewingSlipRecord, setViewingSlipRecord] = useState<PayrollRecord | null>(null);

  // Edit payment modal
  const [editingRecord, setEditingRecord] = useState<PayrollRecord | null>(null);
  const [editStatus, setEditStatus] = useState<'Paid' | 'Processing' | 'Pending'>('Paid');
  const [editMethod, setEditMethod] = useState<'Cash' | 'Bank Transfer' | 'EasyPaisa' | 'JazzCash' | 'Cheque'>('Bank Transfer');
  const [editVoucher, setEditVoucher] = useState('');
  const [editTravelAllowance, setEditTravelAllowance] = useState(0);
  const [editHardshipAllowance, setEditHardshipAllowance] = useState(0);
  const [editSpecialAllowance, setEditSpecialAllowance] = useState(0);
  const [editRemarks, setEditRemarks] = useState('');

  // Available months
  const monthsList = [
    { id: '2026-10', label: 'October 2026 (Current)' },
    { id: '2026-09', label: 'September 2026' },
    { id: '2026-08', label: 'August 2026' },
  ];

  // Filtered payroll records
  const filteredPayroll = useMemo(() => {
    let list = payroll.filter(p => p.month === selectedMonth);

    if (schoolFilter !== 'all') {
      list = list.filter(p => p.schoolId === schoolFilter);
    } else if (activeSchoolId !== 'all') {
      list = list.filter(p => p.schoolId === activeSchoolId);
    }

    if (statusFilter !== 'all') {
      list = list.filter(p => p.paymentStatus === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => {
        const stf = staff.find(s => s.id === p.staffId);
        return stf?.name.toLowerCase().includes(q) || stf?.employeeId.toLowerCase().includes(q) || stf?.cnic.includes(q);
      });
    }

    return list;
  }, [payroll, selectedMonth, schoolFilter, activeSchoolId, statusFilter, searchQuery, staff]);

  // Aggregate totals
  const totalBasePay = useMemo(() => filteredPayroll.reduce((sum, p) => sum + p.baseSalary, 0), [filteredPayroll]);
  const totalDeductions = useMemo(() => filteredPayroll.reduce((sum, p) => sum + (p.deductions.absenceDeduction || 0), 0), [filteredPayroll]);
  const totalNetPay = useMemo(() => filteredPayroll.reduce((sum, p) => sum + p.netSalary, 0), [filteredPayroll]);
  const paidCount = useMemo(() => filteredPayroll.filter(p => p.paymentStatus === 'Paid').length, [filteredPayroll]);
  const pendingHTConfirmationCount = useMemo(() => {
    return filteredPayroll.filter(p => p.paymentStatus === 'Paid' && p.headTeacherApprovalStatus !== 'Confirmed Received').length;
  }, [filteredPayroll]);

  const handleGeneratePayroll = () => {
    generateMonthlyPayroll(schoolFilter, selectedMonth);
  };

  const handleOpenEdit = (rec: PayrollRecord) => {
    setEditingRecord(rec);
    setEditStatus(rec.paymentStatus);
    setEditMethod(rec.paymentMethod || 'Bank Transfer');
    setEditVoucher(rec.receiptVoucherNo || `SRESO-VR-2026-${Math.floor(100 + Math.random() * 900)}`);
    setEditTravelAllowance(rec.allowances.travel || 0);
    setEditHardshipAllowance(rec.allowances.hardship || 0);
    setEditSpecialAllowance(rec.allowances.special || 0);
    setEditRemarks(rec.remarks || '');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    const totalAllowances = Number(editTravelAllowance) + Number(editHardshipAllowance) + Number(editSpecialAllowance);
    const deductions = editingRecord.deductions.absenceDeduction || 0;
    const netSalary = Math.max(0, editingRecord.baseSalary + totalAllowances - deductions);

    updatePayrollRecord({
      ...editingRecord,
      allowances: {
        travel: Number(editTravelAllowance) || undefined,
        hardship: Number(editHardshipAllowance) || undefined,
        special: Number(editSpecialAllowance) || undefined,
      },
      netSalary,
      paymentStatus: editStatus,
      paymentMethod: editMethod,
      receiptVoucherNo: editVoucher.trim() || undefined,
      paymentDate: editStatus === 'Paid' ? (editingRecord.paymentDate || new Date().toISOString().split('T')[0]) : undefined,
      remarks: editRemarks.trim() || undefined,
    });

    setEditingRecord(null);
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Head Teacher Salary Receipt Confirmation Alert Banner */}
      {isHT && pendingHTConfirmationCount > 0 && (
        <div className="bg-amber-500/10 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-slate-900 dark:text-white text-xs">
                Salary Disbursement Acknowledgment Required ({pendingHTConfirmationCount} Pending)
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Central Operator Muhammad Saleh Mangi has marked {pendingHTConfirmationCount} salary payment(s) as Paid. Please review and confirm that you and your school teaching staff have received their dues.
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              const targetSchool = schoolFilter !== 'all' ? schoolFilter : (currentUser?.schoolId || schools[0]?.id);
              if (targetSchool) {
                confirmAllSchoolPayroll(targetSchool, selectedMonth);
              }
            }}
            className="shrink-0 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer transition"
          >
            <CheckCircle2 className="w-4 h-4" />
            Confirm All {pendingHTConfirmationCount} as Received
          </button>
        </div>
      )}

      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Central Employee Salary & Payroll Management
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Head Teachers, Senior/Junior Teachers & Peons salary calculation, attendance deductions, and payslips
          </p>
        </div>

        <button
          onClick={handleGeneratePayroll}
          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          Auto-Generate {selectedMonth} Payroll
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] text-slate-500">Monthly Net Payroll</div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            PKR {totalNetPay.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">{filteredPayroll.length} Employees in month</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] text-slate-500">Base Salary Total</div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
            PKR {totalBasePay.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Approved basic contract pay</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] text-slate-500">Absence Deductions</div>
          <div className="text-xl font-black text-rose-500 mt-1">
            - PKR {totalDeductions.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Attendance-based unexcused deductions</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] text-slate-500">Disbursement Status</div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
            {paidCount} / {filteredPayroll.length} Paid
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {filteredPayroll.length - paidCount} Pending Disbursement
          </div>
        </div>
      </div>

      {/* Filter and Month Bar */}
      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Month selector */}
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
          >
            {monthsList.map(m => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>

          {activeSchoolId === 'all' && (
            <select
              value={schoolFilter}
              onChange={e => setSchoolFilter(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="all">All Schools</option>
              {schools.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Processing">Processing</option>
            <option value="Pending">Pending</option>
          </select>
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search employee name, ID..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none"
          />
        </div>
      </div>

      {/* Payroll Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                <th className="p-3">Staff Member & Role</th>
                <th className="p-3">School</th>
                <th className="p-3">Base Pay</th>
                <th className="p-3">Allowances</th>
                <th className="p-3">Absence Deductions</th>
                <th className="p-3">Net Pay</th>
                <th className="p-3">Status & Method</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
              {filteredPayroll.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No payroll entries found for {selectedMonth}. Click "Auto-Generate Payroll" above to populate records.
                  </td>
                </tr>
              ) : (
                filteredPayroll.map(rec => {
                  const stf = staff.find(s => s.id === rec.staffId);
                  const sch = schools.find(s => s.id === rec.schoolId);
                  const totalAllowances =
                    (rec.allowances.travel || 0) +
                    (rec.allowances.hardship || 0) +
                    (rec.allowances.special || 0);

                  return (
                    <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <td className="p-3">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{stf?.name || 'Staff Member'}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span className="font-semibold text-slate-500">{stf?.designation}</span>
                          <span>•</span>
                          <span className="font-mono">{stf?.employeeId}</span>
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="font-medium text-slate-900 dark:text-white truncate max-w-[130px]">
                          {sch?.name || 'School'}
                        </div>
                        <div className="text-[10px] text-slate-400">{sch?.district}</div>
                      </td>

                      <td className="p-3 font-mono font-semibold">
                        PKR {rec.baseSalary.toLocaleString()}
                      </td>

                      <td className="p-3 font-mono text-emerald-600 dark:text-emerald-400">
                        {totalAllowances > 0 ? `+ PKR ${totalAllowances.toLocaleString()}` : '—'}
                      </td>

                      <td className="p-3">
                        {rec.deductions.unexcusedAbsenceDays > 0 ? (
                          <div className="text-rose-600 dark:text-rose-400 font-mono">
                            - PKR {rec.deductions.absenceDeduction.toLocaleString()}
                            <div className="text-[10px] opacity-80">
                              ({rec.deductions.unexcusedAbsenceDays} days absent)
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono">PKR 0</span>
                        )}
                      </td>

                      <td className="p-3 font-mono font-black text-sm text-slate-900 dark:text-white">
                        PKR {rec.netSalary.toLocaleString()}
                      </td>

                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          rec.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                          rec.paymentStatus === 'Processing' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                          'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}>
                          {rec.paymentStatus}
                        </span>
                        {rec.paymentMethod && (
                          <div className="text-[10px] text-slate-400 mt-0.5">{rec.paymentMethod}</div>
                        )}
                        {/* Head Teacher Verification Status */}
                        {rec.paymentStatus === 'Paid' && (
                          <div className="mt-1">
                            {rec.headTeacherApprovalStatus === 'Confirmed Received' ? (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800" title={`Confirmed by ${rec.headTeacherApprovedBy || 'HT'} on ${rec.headTeacherApprovalDate}`}>
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                                HT Verified
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                <Clock className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                                Pending HT Ack
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isHT && rec.paymentStatus === 'Paid' && rec.headTeacherApprovalStatus !== 'Confirmed Received' && (
                            <button
                              onClick={() => confirmPayrollReceipt(rec.id, 'Verified and acknowledged received by Head Teacher')}
                              className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 text-[10px] font-bold shadow-xs cursor-pointer"
                              title="Confirm you or your staff have received this paid salary"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Confirm Received</span>
                            </button>
                          )}

                          <button
                            onClick={() => setViewingSlipRecord(rec)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950 flex items-center gap-1 text-[11px] font-semibold"
                            title="Generate and Print Official Salary Payslip"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Slip</span>
                          </button>

                          {isOperator && (
                            <button
                              onClick={() => handleOpenEdit(rec)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                              title="Edit Allowances or Disburse"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Payment & Allowances Modal */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-2xl text-slate-900 dark:text-white">
            <h3 className="text-base font-bold mb-1">Update Salary Disbursal</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Adjust allowances, payment method, voucher number and disbursement status.
            </p>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Disbursement Status</label>
                  <select
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs focus:outline-none"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Processing">Processing</option>
                    <option value="Paid">Paid / Disbursed</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Payment Method</label>
                  <select
                    value={editMethod}
                    onChange={e => setEditMethod(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs focus:outline-none"
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="EasyPaisa">EasyPaisa</option>
                    <option value="JazzCash">JazzCash</option>
                    <option value="Cash">Cash Acquittance</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Receipt / Voucher Number</label>
                <input
                  type="text"
                  value={editVoucher}
                  onChange={e => setEditVoucher(e.target.value)}
                  placeholder="e.g. SRESO-VR-2026-101"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-mono focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Travel (PKR)</label>
                  <input
                    type="number"
                    value={editTravelAllowance}
                    onChange={e => setEditTravelAllowance(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1.5 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Hardship (PKR)</label>
                  <input
                    type="number"
                    value={editHardshipAllowance}
                    onChange={e => setEditHardshipAllowance(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1.5 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Special (PKR)</label>
                  <input
                    type="number"
                    value={editSpecialAllowance}
                    onChange={e => setEditSpecialAllowance(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1.5 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Operator Remarks</label>
                <input
                  type="text"
                  value={editRemarks}
                  onChange={e => setEditRemarks(e.target.value)}
                  placeholder="Payment remarks or bank branch ref"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                >
                  Save Salary Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Salary Slip Generator Modal */}
      {viewingSlipRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white text-slate-900 rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Payslip Header */}
            <div className="flex items-center justify-between pb-3 border-b-2 border-slate-900">
              <div>
                <h3 className="text-base font-extrabold uppercase tracking-wide text-emerald-800">
                  Sindh Rural Education Support Organization (SRESO)
                </h3>
                <p className="text-xs text-slate-600">
                  Sindh Education Foundation (SEF) Partner School Network
                </p>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                  Monthly Salary Pay Slip • {viewingSlipRecord.month}
                </p>
              </div>
              <button
                onClick={() => setViewingSlipRecord(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Slip Meta details */}
            {(() => {
              const stf = staff.find(s => s.id === viewingSlipRecord.staffId);
              const sch = schools.find(s => s.id === viewingSlipRecord.schoolId);
              const allowancesTotal =
                (viewingSlipRecord.allowances.travel || 0) +
                (viewingSlipRecord.allowances.hardship || 0) +
                (viewingSlipRecord.allowances.special || 0);

              return (
                <div className="mt-4 space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Employee Name:</span>
                      <strong className="text-sm">{stf?.name}</strong>
                      <span className="block text-[11px] text-slate-600">{stf?.designation}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">School Campus:</span>
                      <strong className="text-sm">{sch?.name}</strong>
                      <span className="block text-[11px] text-slate-600 font-mono">{sch?.code} • {sch?.district}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">CNIC:</span>
                      <strong className="font-mono">{stf?.cnic}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Employee ID:</span>
                      <strong className="font-mono">{stf?.employeeId}</strong>
                    </div>
                  </div>

                  {/* Breakdown table */}
                  <table className="w-full border-collapse border border-slate-200 text-xs mt-3">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-700">
                        <th className="p-2 text-left">Earnings</th>
                        <th className="p-2 text-right">Amount (PKR)</th>
                        <th className="p-2 text-left border-l border-slate-200">Deductions</th>
                        <th className="p-2 text-right">Amount (PKR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr>
                        <td className="p-2">Basic Contract Salary</td>
                        <td className="p-2 text-right font-mono font-semibold">{viewingSlipRecord.baseSalary.toLocaleString()}</td>
                        <td className="p-2 border-l border-slate-200">
                          Absence Deductions ({viewingSlipRecord.deductions.unexcusedAbsenceDays} days)
                        </td>
                        <td className="p-2 text-right font-mono text-rose-600">
                          {viewingSlipRecord.deductions.absenceDeduction.toLocaleString()}
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2">Travel Allowance</td>
                        <td className="p-2 text-right font-mono">{(viewingSlipRecord.allowances.travel || 0).toLocaleString()}</td>
                        <td className="p-2 border-l border-slate-200">Income Tax / Levies</td>
                        <td className="p-2 text-right font-mono">0</td>
                      </tr>
                      <tr>
                        <td className="p-2">Hardship / Special Allowance</td>
                        <td className="p-2 text-right font-mono">
                          {((viewingSlipRecord.allowances.hardship || 0) + (viewingSlipRecord.allowances.special || 0)).toLocaleString()}
                        </td>
                        <td className="p-2 border-l border-slate-200">Other Deductions</td>
                        <td className="p-2 text-right font-mono">0</td>
                      </tr>
                      <tr className="bg-emerald-50 font-bold border-t-2 border-slate-900">
                        <td className="p-2">Total Gross Earnings</td>
                        <td className="p-2 text-right font-mono">
                          {(viewingSlipRecord.baseSalary + allowancesTotal).toLocaleString()}
                        </td>
                        <td className="p-2 border-l border-slate-200">Total Deductions</td>
                        <td className="p-2 text-right font-mono text-rose-600">
                          {viewingSlipRecord.deductions.absenceDeduction.toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Net Pay Box */}
                  <div className="p-3 bg-emerald-900 text-white rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-emerald-200 uppercase tracking-wider font-semibold">Net Payable Amount</div>
                      <div className="text-xl font-black font-mono">PKR {viewingSlipRecord.netSalary.toLocaleString()}</div>
                    </div>
                    <div className="text-right text-[11px] text-emerald-200">
                      <div>Status: <strong>{viewingSlipRecord.paymentStatus}</strong></div>
                      <div>Voucher #: <strong>{viewingSlipRecord.receiptVoucherNo || 'N/A'}</strong></div>
                    </div>
                  </div>

                  {/* Head Teacher Verification Acknowledgment */}
                  <div className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                    viewingSlipRecord.headTeacherApprovalStatus === 'Confirmed Received'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                      : 'bg-amber-50 border-amber-300 text-amber-950'
                  }`}>
                    <div className="flex items-start sm:items-center gap-2">
                      <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 sm:mt-0 ${
                        viewingSlipRecord.headTeacherApprovalStatus === 'Confirmed Received' ? 'text-emerald-600' : 'text-amber-600'
                      }`} />
                      <div>
                        <div className="font-bold text-[11px]">
                          {viewingSlipRecord.headTeacherApprovalStatus === 'Confirmed Received'
                            ? 'Head Teacher Verified & Received'
                            : 'Pending Head Teacher Acknowledgment'}
                        </div>
                        <div className="text-[10px] text-slate-600">
                          {viewingSlipRecord.headTeacherApprovalStatus === 'Confirmed Received'
                            ? `Confirmed by ${viewingSlipRecord.headTeacherApprovedBy || 'Head Teacher'} on ${viewingSlipRecord.headTeacherApprovalDate || ''}${viewingSlipRecord.headTeacherApprovalRemarks ? ` • "${viewingSlipRecord.headTeacherApprovalRemarks}"` : ''}`
                            : 'Awaiting Head Teacher physical verification of cash/bank credit to staff.'}
                        </div>
                      </div>
                    </div>
                    {isHT && viewingSlipRecord.paymentStatus === 'Paid' && viewingSlipRecord.headTeacherApprovalStatus !== 'Confirmed Received' && (
                      <button
                        type="button"
                        onClick={() => {
                          confirmPayrollReceipt(viewingSlipRecord.id, 'Verified and acknowledged by Head Teacher on pay slip');
                          setViewingSlipRecord(prev => prev ? ({
                            ...prev,
                            headTeacherApprovalStatus: 'Confirmed Received',
                            headTeacherApprovalDate: new Date().toISOString().split('T')[0],
                            headTeacherApprovedBy: currentUser?.name || 'Head Teacher'
                          }) : null);
                        }}
                        className="shrink-0 px-3 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[10px] cursor-pointer"
                      >
                        Confirm Received
                      </button>
                    )}
                  </div>

                  {/* Signatures */}
                  <div className="grid grid-cols-3 gap-4 pt-8 text-center text-xs text-slate-500">
                    <div className="border-t border-slate-400 pt-1">
                      Employee Signature
                    </div>
                    <div className="border-t border-slate-400 pt-1">
                      Head Teacher Verification
                    </div>
                    <div className="border-t border-slate-400 pt-1">
                      Operator / Finance Officer
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      Print Pay Slip
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewingSlipRecord(null)}
                      className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-600"
                    >
                      Close
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
