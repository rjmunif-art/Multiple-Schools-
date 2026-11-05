import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Search,
  X,
  School,
  GraduationCap,
  Users,
  AlertTriangle,
  CheckSquare,
  Compass,
  FileText,
  ArrowRight
} from 'lucide-react';

export const GlobalSearchModal: React.FC = () => {
  const {
    isSearchOpen,
    setIsSearchOpen,
    schools,
    students,
    staff,
    issues,
    tasks,
    visits,
    documents,
    setActiveSchoolId,
    setCurrentTab,
    setSelectedSchoolIdForProfile,
  } = useApp();

  const [query, setQuery] = useState('');

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || q.length < 2) return [];

    const results: {
      id: string;
      type: 'school' | 'student' | 'teacher' | 'head_teacher' | 'issue' | 'task' | 'visit' | 'document';
      title: string;
      subtitle: string;
      badge: string;
      schoolName: string;
      onClick: () => void;
    }[] = [];

    // Search schools
    schools.forEach(s => {
      if (
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.district.toLowerCase().includes(q) ||
        s.taluka.toLowerCase().includes(q) ||
        s.village.toLowerCase().includes(q) ||
        s.headTeacherName.toLowerCase().includes(q)
      ) {
        results.push({
          id: `sch-${s.id}`,
          type: 'school',
          title: s.name,
          subtitle: `Code: ${s.code} • ${s.taluka}, ${s.district} • HT: ${s.headTeacherName}`,
          badge: 'School',
          schoolName: s.name,
          onClick: () => {
            setActiveSchoolId(s.id);
            setSelectedSchoolIdForProfile(s.id);
            setCurrentTab('schools');
            setIsSearchOpen(false);
          },
        });
      }
    });

    // Search students
    students.forEach(st => {
      const sch = schools.find(s => s.id === st.schoolId);
      if (
        st.name.toLowerCase().includes(q) ||
        st.fatherName.toLowerCase().includes(q) ||
        st.grNumber.toLowerCase().includes(q) ||
        st.bFormNumber.toLowerCase().includes(q) ||
        st.grade.toLowerCase().includes(q)
      ) {
        results.push({
          id: `std-${st.id}`,
          type: 'student',
          title: st.name,
          subtitle: `GR: ${st.grNumber} • Father: ${st.fatherName} • ${st.grade} • ${st.status}`,
          badge: 'Student',
          schoolName: sch?.name || 'School',
          onClick: () => {
            setActiveSchoolId(st.schoolId);
            setCurrentTab('students');
            setIsSearchOpen(false);
          },
        });
      }
    });

    // Search staff (Teachers & Head Teachers & Peons)
    staff.forEach(stf => {
      const sch = schools.find(s => s.id === stf.schoolId);
      if (
        stf.name.toLowerCase().includes(q) ||
        stf.employeeId.toLowerCase().includes(q) ||
        stf.cnic.includes(q) ||
        stf.qualification.toLowerCase().includes(q) ||
        stf.designation.toLowerCase().includes(q)
      ) {
        results.push({
          id: `stf-${stf.id}`,
          type: stf.designation === 'Head Teacher' ? 'head_teacher' : 'teacher',
          title: stf.name,
          subtitle: `${stf.designation} • ID: ${stf.employeeId} • Base Pay: PKR ${stf.baseSalary.toLocaleString()}`,
          badge: stf.designation,
          schoolName: sch?.name || 'School',
          onClick: () => {
            setActiveSchoolId(stf.schoolId);
            setCurrentTab('staff');
            setIsSearchOpen(false);
          },
        });
      }
    });

    // Search Issues
    issues.forEach(iss => {
      const sch = schools.find(s => s.id === iss.schoolId);
      if (
        iss.description.toLowerCase().includes(q) ||
        iss.category.toLowerCase().includes(q) ||
        iss.responsiblePerson.toLowerCase().includes(q)
      ) {
        results.push({
          id: `iss-${iss.id}`,
          type: 'issue',
          title: iss.category + ' Issue: ' + iss.description.substring(0, 50) + '...',
          subtitle: `Priority: ${iss.priority} • Status: ${iss.status} • Resp: ${iss.responsiblePerson}`,
          badge: 'Issue',
          schoolName: sch?.name || 'School',
          onClick: () => {
            setActiveSchoolId(iss.schoolId);
            setCurrentTab('issues');
            setIsSearchOpen(false);
          },
        });
      }
    });

    // Search Tasks
    tasks.forEach(tsk => {
      const sch = schools.find(s => s.id === tsk.schoolId);
      if (
        tsk.title.toLowerCase().includes(q) ||
        tsk.assignedTo.toLowerCase().includes(q)
      ) {
        results.push({
          id: `tsk-${tsk.id}`,
          type: 'task',
          title: tsk.title,
          subtitle: `Assigned: ${tsk.assignedTo} • Due: ${tsk.dueDate} • Status: ${tsk.status}`,
          badge: 'Task',
          schoolName: sch?.name || 'School',
          onClick: () => {
            setActiveSchoolId(tsk.schoolId);
            setCurrentTab('tasks');
            setIsSearchOpen(false);
          },
        });
      }
    });

    // Search Documents
    documents.forEach(doc => {
      const sch = schools.find(s => s.id === doc.schoolId);
      if (
        doc.title.toLowerCase().includes(q) ||
        doc.category.toLowerCase().includes(q)
      ) {
        results.push({
          id: `doc-${doc.id}`,
          type: 'document',
          title: doc.title,
          subtitle: `Category: ${doc.category} • ${doc.fileType} (${doc.fileSize})`,
          badge: 'Document',
          schoolName: sch?.name || 'School',
          onClick: () => {
            setActiveSchoolId(doc.schoolId);
            setSelectedSchoolIdForProfile(doc.schoolId);
            setCurrentTab('schools');
            setIsSearchOpen(false);
          },
        });
      }
    });

    return results.slice(0, 20); // Top 20 results
  }, [query, schools, students, staff, issues, tasks, documents, setActiveSchoolId, setSelectedSchoolIdForProfile, setCurrentTab, setIsSearchOpen]);

  if (!isSearchOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 text-white rounded-3xl shadow-2xl overflow-hidden mt-6 flex flex-col max-h-[85vh]">
        {/* Search header */}
        <div className="p-3.5 border-b border-slate-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-emerald-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search Muhammad, Chandio, Class V, Solar pump, GR-1001..."
            autoFocus
            className="flex-1 bg-transparent text-sm sm:text-base text-white placeholder-slate-400 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-xs text-slate-400 hover:text-white p-1"
            >
              Clear
            </button>
          )}
          <button
            onClick={() => setIsSearchOpen(false)}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results Body */}
        <div className="flex-1 overflow-y-auto p-3">
          {!query || query.length < 2 ? (
            <div className="py-12 text-center text-slate-400">
              <Search className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-medium">Type at least 2 characters to search across all SEF records</p>
              <p className="text-xs text-slate-500 mt-1">
                Searches Schools, Students, Teachers, Head Teachers, Visits, Issues, and Tasks
              </p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <p className="text-sm">No matching records found for "{query}"</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 pb-1">
                Found {searchResults.length} {searchResults.length === 1 ? 'match' : 'matches'}
              </div>
              {searchResults.map(res => (
                <button
                  key={res.id}
                  onClick={res.onClick}
                  className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 text-left transition cursor-pointer group"
                >
                  <div className="flex items-start gap-3 truncate pr-2">
                    <div className="w-8 h-8 rounded-xl bg-slate-700/80 flex items-center justify-center shrink-0 mt-0.5 text-emerald-400">
                      {res.type === 'school' && <School className="w-4 h-4" />}
                      {res.type === 'student' && <GraduationCap className="w-4 h-4" />}
                      {(res.type === 'teacher' || res.type === 'head_teacher') && <Users className="w-4 h-4" />}
                      {res.type === 'issue' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                      {res.type === 'task' && <CheckSquare className="w-4 h-4 text-blue-400" />}
                      {res.type === 'document' && <FileText className="w-4 h-4 text-purple-400" />}
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white truncate">{res.title}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 shrink-0">
                          {res.badge}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5 truncate">{res.subtitle}</div>
                      <div className="text-[10px] text-emerald-400/90 mt-0.5">{res.schoolName}</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 shrink-0 group-hover:translate-x-0.5 transition" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
