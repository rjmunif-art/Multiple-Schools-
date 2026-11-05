import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  CheckSquare,
  Plus,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Edit2,
  School as SchoolIcon,
  Check,
  Search
} from 'lucide-react';
import { SchoolTask } from '../../types';

export const TaskManager: React.FC = () => {
  const {
    tasks,
    schools,
    addTask,
    updateTask,
    deleteTask,
    activeSchoolId,
    currentUser,
  } = useApp();

  const isOperator = currentUser?.role === 'operator';
  const isHT = currentUser?.role === 'head_teacher';
  const isSupervisor = currentUser?.role === 'supervisor';

  const [activeTab, setActiveTab] = useState<'Today' | 'Overdue' | 'Upcoming' | 'Completed' | 'all'>('Today');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState<SchoolTask | null>(null);

  // Form Fields
  const [formSchoolId, setFormSchoolId] = useState(schools[0]?.id || '');
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formAssignedTo, setFormAssignedTo] = useState('');
  const [formDueDate, setFormDueDate] = useState('2026-10-30');
  const [formPriority, setFormPriority] = useState<SchoolTask['priority']>('High');
  const [formStatus, setFormStatus] = useState<SchoolTask['status']>('Today');
  const [formRemarks, setFormRemarks] = useState('');

  const filteredTasks = useMemo(() => {
    let list = [...tasks];

    if (activeSchoolId !== 'all') {
      list = list.filter(t => t.schoolId === activeSchoolId);
    }

    if (activeTab !== 'all') {
      list = list.filter(t => t.status === activeTab);
    }

    return list;
  }, [tasks, activeSchoolId, activeTab]);

  const todayCount = tasks.filter(t => t.status === 'Today').length;
  const overdueCount = tasks.filter(t => t.status === 'Overdue').length;
  const upcomingCount = tasks.filter(t => t.status === 'Upcoming').length;
  const completedCount = tasks.filter(t => t.status === 'Completed').length;

  const handleOpenAdd = () => {
    setEditingTask(null);
    setFormSchoolId(activeSchoolId !== 'all' ? activeSchoolId : (schools[0]?.id || ''));
    setFormTitle('');
    setFormDesc('');
    const sch = schools.find(s => s.id === (activeSchoolId !== 'all' ? activeSchoolId : schools[0]?.id));
    setFormAssignedTo(sch ? sch.headTeacherName : 'Head Teacher');
    setFormDueDate('2026-10-30');
    setFormPriority('High');
    setFormStatus('Today');
    setFormRemarks('');
    setShowAddModal(true);
  };

  const handleOpenEdit = (task: SchoolTask) => {
    setEditingTask(task);
    setFormSchoolId(task.schoolId);
    setFormTitle(task.title);
    setFormDesc(task.description || '');
    setFormAssignedTo(task.assignedTo);
    setFormDueDate(task.dueDate);
    setFormPriority(task.priority);
    setFormStatus(task.status);
    setFormRemarks(task.remarks || '');
    setShowAddModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    if (editingTask) {
      updateTask({
        ...editingTask,
        schoolId: formSchoolId,
        title: formTitle.trim(),
        description: formDesc.trim() || undefined,
        assignedTo: formAssignedTo.trim(),
        dueDate: formDueDate,
        priority: formPriority,
        status: formStatus,
        remarks: formRemarks.trim() || undefined,
      });
    } else {
      addTask({
        schoolId: formSchoolId,
        title: formTitle.trim(),
        description: formDesc.trim() || undefined,
        assignedTo: formAssignedTo.trim(),
        createdDate: new Date().toISOString().split('T')[0],
        dueDate: formDueDate,
        priority: formPriority,
        status: formStatus,
        remarks: formRemarks.trim() || undefined,
      });
    }
    setShowAddModal(false);
  };

  const toggleTaskCompleted = (task: SchoolTask) => {
    updateTask({
      ...task,
      status: task.status === 'Completed' ? 'Today' : 'Completed',
      completedDate: task.status === 'Completed' ? undefined : new Date().toISOString().split('T')[0],
    });
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            School Operational Tasks & Directives ({filteredTasks.length})
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Assign directives to Head Teachers with deadlines, track completion and reminders
          </p>
        </div>

        {!isSupervisor && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Assign New Task
          </button>
        )}
      </div>

      {/* Tabs Filter */}
      <div className="flex rounded-2xl bg-slate-200 dark:bg-slate-800 p-1 border border-slate-300 dark:border-slate-700">
        {[
          { id: 'Today', label: `Today's Tasks (${todayCount})` },
          { id: 'Overdue', label: `Overdue (${overdueCount})` },
          { id: 'Upcoming', label: `Upcoming (${upcomingCount})` },
          { id: 'Completed', label: `Completed (${completedCount})` },
          { id: 'all', label: `All (${tasks.length})` },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer text-center ${
              activeTab === tab.id
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tasks List */}
      <div className="space-y-2.5">
        {filteredTasks.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            No tasks found in {activeTab} status.
          </div>
        ) : (
          filteredTasks.map(task => {
            const sch = schools.find(s => s.id === task.schoolId);
            const isDone = task.status === 'Completed';

            return (
              <div
                key={task.id}
                className={`p-3.5 rounded-2xl border transition flex items-start justify-between gap-3 ${
                  isDone
                    ? 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-70'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs'
                }`}
              >
                <div className="flex items-start gap-3 flex-1">
                  <button
                    onClick={() => toggleTaskCompleted(task)}
                    className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 cursor-pointer transition ${
                      isDone
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-slate-300 dark:border-slate-600 hover:border-emerald-500'
                    }`}
                  >
                    {isDone && <Check className="w-3.5 h-3.5" />}
                  </button>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-xs font-bold ${isDone ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                        {task.title}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                        {sch?.name}
                      </span>
                      <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                        task.priority === 'Critical' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' :
                        task.priority === 'High' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                        'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {task.priority}
                      </span>
                    </div>

                    {task.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-snug">
                        {task.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                      <span>Assigned to: <strong>{task.assignedTo}</strong></span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-slate-400" />
                        Due: {task.dueDate}
                      </span>
                    </div>
                  </div>
                </div>

                {!isSupervisor && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenEdit(task)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {isOperator && (
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-2xl text-slate-900 dark:text-white">
            <h3 className="text-base font-bold mb-1">
              {editingTask ? 'Edit Task' : 'Assign Operational Task'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Direct school staff with specific actions, due dates and priority.
            </p>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">School Campus</label>
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
                <label className="block font-semibold mb-1">Task Title *</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="e.g. Submit verified student list with Form-B"
                  required
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Detailed Description</label>
                <textarea
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                  placeholder="Specific requirements, format or guidelines"
                  rows={2}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Assigned To</label>
                  <input
                    type="text"
                    value={formAssignedTo}
                    onChange={e => setFormAssignedTo(e.target.value)}
                    placeholder="e.g. Head Teacher Master Ghulam Rasool"
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Due Date</label>
                  <input
                    type="date"
                    value={formDueDate}
                    onChange={e => setFormDueDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
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
                    <option value="Today">Today's Task</option>
                    <option value="Upcoming">Upcoming</option>
                    <option value="Overdue">Overdue</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
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
                  {editingTask ? 'Save Task' : 'Assign Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
