import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Compass,
  Calendar,
  Clock,
  Plus,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Camera,
  Star,
  Users,
  Eye,
  FileText,
  Search,
  Filter
} from 'lucide-react';
import { SchoolVisit, ChecklistItem } from '../../types';
import { INITIAL_CHECKLIST_TEMPLATE } from '../../data/sampleData';
import { CustomSelect } from '../common/CustomSelect';

export const SchoolVisitManager: React.FC = () => {
  const {
    visits,
    schools,
    addSchoolVisit,
    activeSchoolId,
    currentUser,
    openPhotoModal,
  } = useApp();

  const isOperator = currentUser?.role === 'operator';
  const isSupervisor = currentUser?.role === 'supervisor';

  const [searchQuery, setSearchQuery] = useState('');
  const [schoolFilter, setSchoolFilter] = useState(activeSchoolId !== 'all' ? activeSchoolId : 'all');
  const [showNewVisitModal, setShowNewVisitModal] = useState(false);
  const [selectedVisitDetails, setSelectedVisitDetails] = useState<SchoolVisit | null>(null);

  // New Visit Form Fields
  const [formSchoolId, setFormSchoolId] = useState(schools[0]?.id || '');
  const [formDate, setFormDate] = useState('2026-10-29');
  const [formArrivalTime, setFormArrivalTime] = useState('08:30 AM');
  const [formDepartureTime, setFormDepartureTime] = useState('11:45 AM');
  const [formVisitorName, setFormVisitorName] = useState(currentUser?.name || 'Engr. Tariq Baloch');
  const [formVisitType, setFormVisitType] = useState<string>('Regular Monitoring');
  const [formPurpose, setFormPurpose] = useState('Assess teaching quality, attendance registers and infrastructure status.');
  const [formHeadTeacherPresent, setFormHeadTeacherPresent] = useState(true);
  const [formTeachersPresent, setFormTeachersPresent] = useState(3);
  const [formTeachersTotal, setFormTeachersTotal] = useState(3);
  const [formStudentsPresent, setFormStudentsPresent] = useState(130);
  const [formStudentsEnrollment, setFormStudentsEnrollment] = useState(140);
  const [formHeadCount, setFormHeadCount] = useState(128); // Physical verification count
  const [formHeadCountRemarks, setFormHeadCountRemarks] = useState('');
  const [formClassroomObs, setFormClassroomObs] = useState('Teacher engaged students in group math exercise on blackboard.');
  const [formTeachingRating, setFormTeachingRating] = useState<1 | 2 | 3 | 4 | 5>(4);
  const [formLearningRating, setFormLearningRating] = useState<1 | 2 | 3 | 4 | 5>(4);
  const [formCleanlinessRating, setFormCleanlinessRating] = useState<1 | 2 | 3 | 4 | 5>(4);
  const [formRegistersUpToDate, setFormRegistersUpToDate] = useState(true);
  const [formChecklist, setFormChecklist] = useState<ChecklistItem[]>(INITIAL_CHECKLIST_TEMPLATE.map(c => ({ ...c })));
  const [formIssuesFound, setFormIssuesFound] = useState('');
  const [formActionsRequired, setFormActionsRequired] = useState('');
  const [formFollowUpDate, setFormFollowUpDate] = useState('2026-11-15');
  const [formRemarks, setFormRemarks] = useState('Head teacher cooperation was satisfactory.');
  const [formGps, setFormGps] = useState<{ lat: number; lng: number } | undefined>(undefined);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [photosList, setPhotosList] = useState<string[]>([]);

  // Filtered visits
  const filteredVisits = useMemo(() => {
    let list = [...visits];

    if (activeSchoolId !== 'all') {
      list = list.filter(v => v.schoolId === activeSchoolId);
    } else if (schoolFilter !== 'all') {
      list = list.filter(v => v.schoolId === schoolFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        v =>
          v.purpose.toLowerCase().includes(q) ||
          v.visitorName.toLowerCase().includes(q) ||
          v.visitType.toLowerCase().includes(q)
      );
    }

    return list;
  }, [visits, activeSchoolId, schoolFilter, searchQuery]);

  const handleCaptureGps = () => {
    setGpsLoading(true);
    // Use cached GPS if already granted previously
    const cached = localStorage.getItem('sef_cached_gps');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.lat && parsed.lng) {
          setFormGps(parsed);
          setGpsLoading(false);
          return;
        }
      } catch (e) {
        // Continue to fresh capture
      }
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          try {
            localStorage.setItem('sef_cached_gps', JSON.stringify(coords));
          } catch (e) {}
          setFormGps(coords);
          setGpsLoading(false);
        },
        () => {
          // Fallback to coordinates in rural Sindh
          const sch = schools.find(s => s.id === formSchoolId);
          setFormGps(sch?.gpsCoordinates || { lat: 26.4251, lng: 67.8631 });
          setGpsLoading(false);
        },
        { timeout: 5000 }
      );
    } else {
      const sch = schools.find(s => s.id === formSchoolId);
      setFormGps(sch?.gpsCoordinates || { lat: 26.4251, lng: 67.8631 });
      setGpsLoading(false);
    }
  };

  const handleAddSamplePhoto = () => {
    const photoUrl = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" fill="%23064e3b"/><text x="50%" y="45%" fill="white" font-size="22" font-weight="bold" font-family="sans-serif" dominant-baseline="middle" text-anchor="middle">MONITORING VISIT EVIDENCE PHOTO</text><text x="50%" y="58%" fill="%23a7f3d0" font-size="16" font-family="sans-serif" dominant-baseline="middle" text-anchor="middle">Field verified timestamp: ${formDate}</text></svg>`;
    setPhotosList([...photosList, photoUrl]);
  };

  const handleSaveVisit = (e: React.FormEvent) => {
    e.preventDefault();
    const issuesArr = formIssuesFound.split('\n').filter(s => s.trim().length > 0);

    addSchoolVisit({
      schoolId: formSchoolId,
      date: formDate,
      arrivalTime: formArrivalTime,
      departureTime: formDepartureTime,
      visitorName: formVisitorName,
      visitType: formVisitType as any,
      purpose: formPurpose,
      headTeacherPresent: formHeadTeacherPresent,
      teachersPresentCount: Number(formTeachersPresent),
      teachersTotalCount: Number(formTeachersTotal),
      studentsPresentCount: Number(formStudentsPresent),
      studentsEnrollmentCount: Number(formStudentsEnrollment),
      headCount: Number(formHeadCount),
      headCountVariance: Number(formHeadCount) - Number(formStudentsPresent),
      headCountRemarks: formHeadCountRemarks.trim() || undefined,
      classroomObservation: formClassroomObs,
      teachingQualityRating: formTeachingRating,
      studentLearningRating: formLearningRating,
      cleanlinessRating: formCleanlinessRating,
      registersUpToDate: formRegistersUpToDate,
      checklist: formChecklist,
      issuesFound: issuesArr,
      actionsRequired: formActionsRequired,
      followUpDate: formFollowUpDate || undefined,
      gpsCoordinates: formGps,
      photos: photosList,
      remarks: formRemarks,
    });

    setShowNewVisitModal(false);
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Compass className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            School Monitoring Visits & Checklist Archive ({filteredVisits.length})
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            17-point quality checklist, arrival/departure logs, GPS verification, and photos
          </p>
        </div>

        {!isSupervisor && (
          <button
            onClick={() => {
              setFormSchoolId(activeSchoolId !== 'all' ? activeSchoolId : (schools[0]?.id || ''));
              setFormChecklist(INITIAL_CHECKLIST_TEMPLATE.map(c => ({ ...c })));
              setPhotosList([]);
              setShowNewVisitModal(true);
            }}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Log New School Visit
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          {activeSchoolId === 'all' && (
            <select
              value={schoolFilter}
              onChange={e => setSchoolFilter(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="all">All Schools Visits</option>
              {schools.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          )}
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search visit purpose, visitor..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none"
          />
        </div>
      </div>

      {/* Visits List */}
      <div className="space-y-3">
        {filteredVisits.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            No school visits recorded matching current criteria.
          </div>
        ) : (
          filteredVisits.map(visit => {
            const sch = schools.find(s => s.id === visit.schoolId);
            const satCount = visit.checklist.filter(c => c.status === 'satisfactory').length;
            const issuesCount = visit.issuesFound.length;

            return (
              <div
                key={visit.id}
                className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-start justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">{sch?.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                      {sch?.code}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      {visit.visitType}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                    Purpose: {visit.purpose}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {visit.date} ({visit.arrivalTime} - {visit.departureTime})
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      Visitor: <strong>{visit.visitorName}</strong>
                    </span>
                    {visit.gpsCoordinates && (
                      <span className="flex items-center gap-1 font-mono text-[11px] text-emerald-600">
                        <MapPin className="w-3 h-3" />
                        {visit.gpsCoordinates.lat.toFixed(4)}, {visit.gpsCoordinates.lng.toFixed(4)}
                      </span>
                    )}
                  </div>

                  {/* Rating & Head Count indicators */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1.5 shadow-xs">
                      <span>Head Count:</span>
                      <strong>{visit.headCount || visit.studentsPresentCount}</strong> / {visit.studentsEnrollmentCount}
                      <span className="text-[10px] opacity-80">
                        ({Math.round(((visit.headCount || visit.studentsPresentCount) / (visit.studentsEnrollmentCount || 1)) * 100)}%)
                      </span>
                    </span>

                    <span className="px-2 py-0.5 rounded-lg text-[11px] bg-slate-800 text-slate-300 border border-slate-700">
                      Register Attendance: <strong>{visit.studentsPresentCount}</strong>
                    </span>

                    {visit.headCountVariance !== undefined && visit.headCountVariance !== 0 && (
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                        visit.headCountVariance < 0
                          ? 'bg-amber-950 text-amber-300 border-amber-800'
                          : 'bg-teal-950 text-teal-300 border-teal-800'
                      }`}>
                        Variance: {visit.headCountVariance > 0 ? `+${visit.headCountVariance}` : visit.headCountVariance}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-0.5 text-[11px]">
                    <span className="flex items-center gap-1">
                      Teaching Quality: <strong className="text-amber-500">{'★'.repeat(visit.teachingQualityRating)}</strong>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      Cleanliness: <strong className="text-amber-500">{'★'.repeat(visit.cleanlinessRating)}</strong>
                    </span>
                    <span>•</span>
                    <span>Checklist: <strong>{satCount} / {visit.checklist.length} Satisfactory</strong></span>
                  </div>

                  {issuesCount > 0 && (
                    <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300">
                      <strong>Issues Recorded:</strong> {visit.issuesFound.join('; ')}
                    </div>
                  )}
                </div>

                {/* Right actions */}
                <div className="flex flex-col sm:items-end gap-2 shrink-0">
                  <button
                    onClick={() => setSelectedVisitDetails(visit)}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Inspection Details
                  </button>

                  {visit.photos && visit.photos.length > 0 && (
                    <button
                      onClick={() => openPhotoModal(`Visit Photo (${visit.date})`, visit.photos[0], visit.purpose)}
                      className="px-3.5 py-1 rounded-xl border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Camera className="w-3 h-3" />
                      View Photo Evidence ({visit.photos.length})
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Visit Inspection Modal (Full 17 checklist items inspection) */}
      {selectedVisitDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl text-slate-900 dark:text-white max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold">Official Monitoring Checklist Report</h3>
                <p className="text-xs text-slate-500">
                  {schools.find(s => s.id === selectedVisitDetails.schoolId)?.name} • {selectedVisitDetails.date}
                </p>
              </div>
              <button
                onClick={() => setSelectedVisitDetails(null)}
                className="text-xs px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 hover:text-slate-900"
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              {/* Physical Head Count Audit Card */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-indigo-950/80 border border-emerald-700/60 shadow-sm space-y-2">
                <div className="flex items-center justify-between border-b border-emerald-800/60 pb-1.5">
                  <span className="font-bold text-xs text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-emerald-400" />
                    SEF Official Physical Head Count Audit
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-200 border border-emerald-700">
                    Field Verified
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center">
                  <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Physical Head Count</span>
                    <span className="text-base font-bold text-emerald-400">
                      {selectedVisitDetails.headCount || selectedVisitDetails.studentsPresentCount}
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Total Enrolled</span>
                    <span className="text-base font-bold text-white">
                      {selectedVisitDetails.studentsEnrollmentCount}
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Register Marked</span>
                    <span className="text-base font-bold text-slate-300">
                      {selectedVisitDetails.studentsPresentCount}
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Head Count %</span>
                    <span className="text-base font-bold text-teal-300">
                      {Math.round(((selectedVisitDetails.headCount || selectedVisitDetails.studentsPresentCount) / (selectedVisitDetails.studentsEnrollmentCount || 1)) * 100)}%
                    </span>
                  </div>
                </div>

                {selectedVisitDetails.headCountVariance !== undefined && selectedVisitDetails.headCountVariance !== 0 && (
                  <div className="text-[11px] text-amber-300 bg-amber-950/40 p-2 rounded-xl border border-amber-800/60">
                    <strong>Register vs Head Count Variance:</strong> {selectedVisitDetails.headCountVariance > 0 ? `+${selectedVisitDetails.headCountVariance}` : selectedVisitDetails.headCountVariance} students difference recorded against morning register.
                  </div>
                )}
                {selectedVisitDetails.headCountRemarks && (
                  <div className="text-[11px] text-slate-300 italic">
                    Head Count Remarks: {selectedVisitDetails.headCountRemarks}
                  </div>
                )}
              </div>

              {/* Classroom Observation */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Classroom Pedagogy & Learning Observation:
                </span>
                <p className="italic text-slate-600 dark:text-slate-300">{selectedVisitDetails.classroomObservation}</p>
              </div>

              {/* 17 Checklist items */}
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider mb-2">
                  17-Point Inspection Checklist Results
                </h4>
                <div className="space-y-1.5 max-h-60 overflow-y-auto p-1">
                  {selectedVisitDetails.checklist.map(chk => (
                    <div key={chk.id} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">{chk.category}</span>
                        <span className="font-medium">{chk.title}</span>
                        {chk.remarks && <span className="block text-[11px] text-slate-500 italic">Note: {chk.remarks}</span>}
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        chk.status === 'satisfactory' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                        chk.status === 'needs_improvement' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                        chk.status === 'unsatisfactory' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {chk.status.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Required */}
              {selectedVisitDetails.actionsRequired && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200">
                  <strong className="block text-xs mb-0.5">Corrective Action Required:</strong>
                  <span>{selectedVisitDetails.actionsRequired}</span>
                  {selectedVisitDetails.followUpDate && (
                    <div className="text-[11px] mt-1 font-semibold">
                      Follow-up Deadline: {selectedVisitDetails.followUpDate}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Log New Visit Modal */}
      {showNewVisitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl text-slate-900 dark:text-white max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold mb-1">Record New School Monitoring Visit</h3>
            <p className="text-xs text-slate-500 mb-4">
              Complete on-site observation, physical Head Count, checklist items, GPS capture, and photograph evidence.
            </p>

            <form onSubmit={handleSaveVisit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">School Visited *</label>
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
                  <label className="block font-semibold mb-1">Visit Type</label>
                  <CustomSelect
                    value={formVisitType}
                    onChange={setFormVisitType}
                    options={[
                      'Regular Monitoring',
                      'Surprise Inspection',
                      'SEF Official Visit',
                      'Assessment Visit',
                      'Special Follow-up'
                    ]}
                    customPlaceholder="Type custom visit type..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Visit Date</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Arrival Time</label>
                  <input
                    type="text"
                    value={formArrivalTime}
                    onChange={e => setFormArrivalTime(e.target.value)}
                    placeholder="08:30 AM"
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Departure Time</label>
                  <input
                    type="text"
                    value={formDepartureTime}
                    onChange={e => setFormDepartureTime(e.target.value)}
                    placeholder="11:45 AM"
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Purpose of Visit</label>
                <input
                  type="text"
                  value={formPurpose}
                  onChange={e => setFormPurpose(e.target.value)}
                  placeholder="e.g. Conduct physical head count, inspect solar battery and review registers"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs focus:outline-none"
                />
              </div>

              {/* Dedicated Physical Head Count Section */}
              <div className="p-3.5 bg-emerald-950/40 border border-emerald-700/60 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between border-b border-emerald-800/60 pb-1.5">
                  <span className="font-bold text-xs text-emerald-300 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-emerald-400" />
                    Physical Head Count & Verification (SEF Standard)
                  </span>
                  <span className="text-[10px] text-emerald-400 font-semibold">
                    {Math.round((Number(formHeadCount) / (Number(formStudentsEnrollment) || 1)) * 100)}% of Enrolled
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-300 mb-1">
                      Physical Head Count *
                    </label>
                    <input
                      type="number"
                      value={formHeadCount}
                      onChange={e => setFormHeadCount(Number(e.target.value))}
                      className="w-full rounded-xl border border-emerald-500 bg-slate-900 px-3 py-2 text-sm font-bold text-emerald-300 focus:outline-none"
                      placeholder="e.g. 128"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Physically counted in classes</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">
                      Attendance Register Count
                    </label>
                    <input
                      type="number"
                      value={formStudentsPresent}
                      onChange={e => setFormStudentsPresent(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Marked in school register</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">
                      Total Enrolled Students
                    </label>
                    <input
                      type="number"
                      value={formStudentsEnrollment}
                      onChange={e => setFormStudentsEnrollment(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Total roster on roll</span>
                  </div>
                </div>

                {Number(formHeadCount) !== Number(formStudentsPresent) && (
                  <div className="p-2 rounded-xl bg-amber-950/50 border border-amber-800 text-[11px] text-amber-200">
                    <strong>Attendance Variance Detected:</strong> Physical head count differs by{' '}
                    <span className="font-bold underline">
                      {Number(formHeadCount) - Number(formStudentsPresent) > 0 ? `+${Number(formHeadCount) - Number(formStudentsPresent)}` : Number(formHeadCount) - Number(formStudentsPresent)}
                    </span>{' '}
                    students compared to the morning register marked by teachers.
                  </div>
                )}

                <div>
                  <input
                    type="text"
                    value={formHeadCountRemarks}
                    onChange={e => setFormHeadCountRemarks(e.target.value)}
                    placeholder="Head count verification remarks (e.g. 2 students went home sick after morning roll-call)"
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 focus:outline-none placeholder-slate-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formHeadTeacherPresent}
                    onChange={e => setFormHeadTeacherPresent(e.target.checked)}
                    className="rounded text-emerald-600 w-3.5 h-3.5"
                  />
                  <span>HT Present</span>
                </label>

                <div>
                  <span className="text-[10px] text-slate-400 block">Teachers Present</span>
                  <input
                    type="number"
                    value={formTeachersPresent}
                    onChange={e => setFormTeachersPresent(Number(e.target.value))}
                    className="w-16 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-1 py-0.5"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formRegistersUpToDate}
                    onChange={e => setFormRegistersUpToDate(e.target.checked)}
                    className="rounded text-emerald-600 w-3.5 h-3.5"
                  />
                  <span>Registers OK</span>
                </label>
              </div>

              {/* Checklist review */}
              <div>
                <label className="block font-semibold mb-1">Checklist Sample Items Evaluation</label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto p-1 border border-slate-200 dark:border-slate-700 rounded-xl">
                  {formChecklist.map((item, idx) => (
                    <div key={item.id} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between text-xs">
                      <span className="font-medium truncate max-w-[200px]">{item.title}</span>
                      <select
                        value={item.status}
                        onChange={e => {
                          const updated = [...formChecklist];
                          updated[idx].status = e.target.value as any;
                          setFormChecklist(updated);
                        }}
                        className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-0.5 text-[11px]"
                      >
                        <option value="satisfactory">✓ Satisfactory</option>
                        <option value="needs_improvement">⚠ Needs Improvement</option>
                        <option value="unsatisfactory">✕ Unsatisfactory</option>
                        <option value="not_applicable">N/A</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* GPS & Photo evidence capture */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCaptureGps}
                    disabled={gpsLoading}
                    className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    {gpsLoading ? 'Acquiring GPS...' : formGps ? 'GPS Captured ✓' : 'Capture Field GPS'}
                  </button>
                  {formGps && (
                    <span className="font-mono text-[11px] text-emerald-600">
                      {formGps.lat.toFixed(4)}, {formGps.lng.toFixed(4)}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleAddSamplePhoto}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  + Attach Visit Photo ({photosList.length})
                </button>
              </div>

              <div>
                <label className="block font-semibold mb-1">Issues Found (one per line)</label>
                <textarea
                  value={formIssuesFound}
                  onChange={e => setFormIssuesFound(e.target.value)}
                  placeholder="e.g. 2 dual desks require welding; water tank needs cleaning."
                  rows={2}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Actions Required</label>
                <input
                  type="text"
                  value={formActionsRequired}
                  onChange={e => setFormActionsRequired(e.target.value)}
                  placeholder="e.g. Head Teacher to hire carpenter by Monday."
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewVisitModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                >
                  Save Monitoring Visit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
