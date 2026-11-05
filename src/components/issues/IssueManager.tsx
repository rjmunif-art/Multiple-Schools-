import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  AlertTriangle,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Calendar,
  User,
  School as SchoolIcon,
  Camera,
  Edit2,
  Trash2,
  Check
} from 'lucide-react';
import { SchoolIssue } from '../../types';

export const IssueManager: React.FC = () => {
  const {
    issues,
    schools,
    addIssue,
    updateIssue,
    deleteIssue,
    activeSchoolId,
    currentUser,
    openPhotoModal,
  } = useApp();

  const isOperator = currentUser?.role === 'operator';
  const isHT = currentUser?.role === 'head_teacher';
  const isSupervisor = currentUser?.role === 'supervisor';

  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [schoolFilter, setSchoolFilter] = useState(activeSchoolId !== 'all' ? activeSchoolId : 'all');

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingIssue, setEditingIssue] = useState<SchoolIssue | null>(null);

  // Form Fields
  const [formSchoolId, setFormSchoolId] = useState(schools[0]?.id || '');
  const [formCategory, setFormCategory] = useState<SchoolIssue['category']>('Infrastructure');
  const [formDescription, setFormDescription] = useState('');
  const [formPriority, setFormPriority] = useState<SchoolIssue['priority']>('High');
  const [formResponsible, setFormResponsible] = useState('');
  const [formDeadline, setFormDeadline] = useState('2026-11-10');
  const [formStatus, setFormStatus] = useState<SchoolIssue['status']>('Open');
  const [formActionTaken, setFormActionTaken] = useState('');
  const [formFollowUpDate, setFormFollowUpDate] = useState('2026-11-05');
  const [formEvidencePhoto, setFormEvidencePhoto] = useState<string | undefined>(undefined);
  const [formRemarks, setFormRemarks] = useState('');

  const filteredIssues = useMemo(() => {
    let list = [...issues];

    if (activeSchoolId !== 'all') {
      list = list.filter(i => i.schoolId === activeSchoolId);
    } else if (schoolFilter !== 'all') {
      list = list.filter(i => i.schoolId === schoolFilter);
    }

    if (priorityFilter !== 'all') {
      list = list.filter(i => i.priority === priorityFilter);
    }

    if (statusFilter !== 'all') {
      list = list.filter(i => i.status === statusFilter);
    }

    if (categoryFilter !== 'all') {
      list = list.filter(i => i.category === categoryFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        i =>
          i.description.toLowerCase().includes(q) ||
          i.responsiblePerson.toLowerCase().includes(q) ||
          (i.actionTaken && i.actionTaken.toLowerCase().includes(q))
      );
    }

    return list;
  }, [issues, activeSchoolId, schoolFilter, priorityFilter, statusFilter, categoryFilter, searchQuery]);

  // Aggregate KPI Counts
  const criticalCount = issues.filter(i => i.priority === 'Critical' && i.status !== 'Closed').length;
  const overdueCount = issues.filter(i => new Date(i.deadline) < new Date('2026-10-29') && i.status !== 'Closed' && i.status !== 'Resolved').length;
  const openCount = issues.filter(i => i.status === 'Open').length;
  const resolvedCount = issues.filter(i => i.status === 'Resolved' || i.status === 'Closed').length;

  const handleOpenAdd = () => {
    setEditingIssue(null);
    setFormSchoolId(activeSchoolId !== 'all' ? activeSchoolId : (schools[0]?.id || ''));
    setFormCategory('Infrastructure');
    setFormDescription('');
    setFormPriority('High');
    const sch = schools.find(s => s.id === (activeSchoolId !== 'all' ? activeSchoolId : schools[0]?.id));
    setFormResponsible(sch ? `HT ${sch.headTeacherName}` : 'Head Teacher');
    setFormDeadline('2026-11-10');
    setFormStatus('Open');
    setFormActionTaken('');
    setFormFollowUpDate('2026-11-05');
    setFormEvidencePhoto(undefined);
    setFormRemarks('');
    setShowAddModal(true);
  };

  const handleOpenEdit = (issue: SchoolIssue) => {
    setEditingIssue(issue);
    setFormSchoolId(issue.schoolId);
    setFormCategory(issue.category);
    setFormDescription(issue.description);
    setFormPriority(issue.priority);
    setFormResponsible(issue.responsiblePerson);
    setFormDeadline(issue.deadline);
    setFormStatus(issue.status);
    setFormActionTaken(issue.actionTaken || '');
    setFormFollowUpDate(issue.followUpDate || '');
    setFormEvidencePhoto(issue.evidencePhoto);
    setFormRemarks(issue.remarks || '');
    setShowAddModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDescription.trim()) return;

    if (editingIssue) {
      updateIssue({
        ...editingIssue,
        schoolId: formSchoolId,
        category: formCategory,
        description: formDescription.trim(),
        priority: formPriority,
        responsiblePerson: formResponsible.trim(),
        deadline: formDeadline,
        status: formStatus,
        actionTaken: formActionTaken.trim() || undefined,
        followUpDate: formFollowUpDate || undefined,
        evidencePhoto: formEvidencePhoto,
        remarks: formRemarks.trim() || undefined,
      });
    } else {
      addIssue({
        schoolId: formSchoolId,
        date: new Date().toISOString().split('T')[0],
        category: formCategory,
        description: formDescription.trim(),
        priority: formPriority,
        responsiblePerson: formResponsible.trim(),
        deadline: formDeadline,
        status: formStatus,
        actionTaken: formActionTaken.trim() || undefined,
        followUpDate: formFollowUpDate || undefined,
        evidencePhoto: formEvidencePhoto,
        remarks: formRemarks.trim() || undefined,
      });
    }
    setShowAddModal(false);
  };

  const handleAttachEvidenceSample = () => {
    const photo = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" fill="%237f1d1d"/><text x="50%" y="45%" fill="white" font-size="22" font-weight="bold" font-family="sans-serif" dominant-baseline="middle" text-anchor="middle">ISSUE EVIDENCE PHOTOGRAPH</text><text x="50%" y="58%" fill="%23fecaca" font-size="16" font-family="sans-serif" dominant-baseline="middle" text-anchor="middle">Field verified issue record</text></svg>`;
    setFormEvidencePhoto(photo);
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            School Issues & Corrective Action Tracking ({filteredIssues.length})
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Log facility defects, staffing shortages, textbook delays and compliance follow-ups
          </p>
        </div>

        {!isSupervisor && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Report New Issue
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs text-center">
          <div className="text-[10px] text-slate-500 font-semibold uppercase">Critical Issues</div>
          <div className="text-xl font-black text-rose-600 mt-0.5">{criticalCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Urgent safety or operational stop</div>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs text-center">
          <div className="text-[10px] text-slate-500 font-semibold uppercase">Open Pending</div>
          <div className="text-xl font-black text-amber-600 mt-0.5">{openCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Action pending assignment</div>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs text-center">
          <div className="text-[10px] text-slate-500 font-semibold uppercase">Overdue Deadline</div>
          <div className="text-xl font-black text-rose-500 mt-0.5">{overdueCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Past resolution target date</div>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs text-center">
          <div className="text-[10px] text-slate-500 font-semibold uppercase">Resolved & Closed</div>
          <div className="text-xl font-black text-emerald-600 mt-0.5">{resolvedCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Successfully closed cases</div>
        </div>
      </div>

      {/* Filter and Search Box */}
      <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
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
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search issue description, person..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none"
          />
        </div>
      </div>

      {/* Issues List */}
      <div className="space-y-3">
        {filteredIssues.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            No issues found matching criteria.
          </div>
        ) : (
          filteredIssues.map(issue => {
            const sch = schools.find(s => s.id === issue.schoolId);

            return (
              <div
                key={issue.id}
                className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-start justify-between gap-3"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">{sch?.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                      {issue.category}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      issue.priority === 'Critical' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 animate-pulse' :
                      issue.priority === 'High' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                      'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                    }`}>
                      {issue.priority} Priority
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      issue.status === 'Resolved' || issue.status === 'Closed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                      issue.status === 'In Progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                      'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}>
                      {issue.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-800 dark:text-slate-200 font-semibold leading-snug">
                    {issue.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
                    <span>Reported: {issue.date}</span>
                    <span>Deadline: <strong className="text-slate-700 dark:text-slate-300 font-mono">{issue.deadline}</strong></span>
                    <span>Responsible: <strong>{issue.responsiblePerson}</strong></span>
                  </div>

                  {issue.actionTaken && (
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
                      <strong className="text-slate-700 dark:text-slate-300">Action Taken / Progress: </strong>
                      <span className="text-slate-600 dark:text-slate-400">{issue.actionTaken}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-start">
                  {issue.evidencePhoto && (
                    <button
                      onClick={() => openPhotoModal(`Issue Evidence (${issue.category})`, issue.evidencePhoto!, issue.description)}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 flex items-center gap-1"
                    >
                      <Camera className="w-3 h-3" />
                      Photo
                    </button>
                  )}

                  {!isSupervisor && (
                    <>
                      <button
                        onClick={() => handleOpenEdit(issue)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Edit Issue"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {isOperator && (
                        <button
                          onClick={() => {
                            if (confirm('Delete this issue record?')) {
                              deleteIssue(issue.id);
                            }
                          }}
                          className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                          title="Delete Issue"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Issue Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-2xl text-slate-900 dark:text-white max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold mb-1">
              {editingIssue ? 'Update School Issue' : 'Report New School Issue'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Log facility failure, boundary wall damage, textbook shortage, or attendance alert.
            </p>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Target School *</label>
                  <select
                    value={formSchoolId}
                    onChange={e => setFormSchoolId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs focus:outline-none"
                  >
                    {schools.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs focus:outline-none"
                  >
                    <option value="Infrastructure">Infrastructure</option>
                    <option value="Staffing">Staffing</option>
                    <option value="Student Attendance">Student Attendance</option>
                    <option value="Academic Quality">Academic Quality</option>
                    <option value="SEF Compliance">SEF Compliance</option>
                    <option value="Community/Parental">Community/Parental</option>
                    <option value="Supplies/Books">Supplies/Books</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Issue Description *</label>
                <textarea
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  placeholder="Detailed description of the issue..."
                  required
                  rows={2}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Priority</label>
                  <select
                    value={formPriority}
                    onChange={e => setFormPriority(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs focus:outline-none"
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Status</label>
                  <select
                    value={formStatus}
                    onChange={e => setFormStatus(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs focus:outline-none"
                  >
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Deadline Date</label>
                  <input
                    type="date"
                    value={formDeadline}
                    onChange={e => setFormDeadline(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Responsible Person</label>
                <input
                  type="text"
                  value={formResponsible}
                  onChange={e => setFormResponsible(e.target.value)}
                  placeholder="e.g. Madam Zubaida (HT) & Mason Contractor"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Action Taken / Resolution Plan</label>
                <textarea
                  value={formActionTaken}
                  onChange={e => setFormActionTaken(e.target.value)}
                  placeholder="Steps already undertaken to resolve..."
                  rows={2}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-slate-600 dark:text-slate-300">Evidence Photo Attachment</span>
                <button
                  type="button"
                  onClick={handleAttachEvidenceSample}
                  className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-semibold"
                >
                  {formEvidencePhoto ? '✓ Photo Ready' : '+ Attach Photo'}
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                >
                  {editingIssue ? 'Update Issue' : 'Submit Issue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
