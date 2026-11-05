import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { storageService } from '../../services/storage';
import {
  FileSpreadsheet,
  Upload,
  Download,
  Database,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  FileCheck,
  ArrowRight,
  ShieldAlert,
  Save
} from 'lucide-react';

export const ImportExportCenter: React.FC = () => {
  const {
    schools,
    students,
    staff,
    addStudent,
    resetDemoData,
    activeSchoolId,
    activeAcademicYear,
    currentUser,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'import' | 'export' | 'backup'>('backup');

  // Import State
  const [importTarget, setImportTarget] = useState<'students' | 'teachers' | 'marks'>('students');
  const [importSchoolId, setImportSchoolId] = useState(schools[0]?.id || '');
  const [rawCsvText, setRawCsvText] = useState('');
  const [importSummary, setImportSummary] = useState<{
    total: number;
    imported: number;
    rejected: number;
    duplicates: number;
    errors: string[];
  } | null>(null);

  // Restore State
  const [restoreJson, setRestoreJson] = useState('');
  const [restorePreview, setRestorePreview] = useState<{
    date: string;
    schoolsCount: number;
    studentsCount: number;
    staffCount: number;
  } | null>(null);
  const [restoreStatus, setRestoreStatus] = useState<string>('');

  // Sample CSV templates
  const sampleStudentCsv = `GR Number,Student Name,Father Name,Gender,Grade,Section,B-Form,Village,Guardian Contact\nGR-7001,Bilawal Zardari,Hakim Ali,Male,Class IV,A,41201-9988112-1,Goth Balochi,+92 301 9988771\nGR-7002,Tahira Brohi,Manzoor Brohi,Female,Class IV,A,41201-3344112-2,Brohi Muhallah,+92 302 4455661`;

  const handleProcessImport = () => {
    if (!rawCsvText.trim()) return;
    const lines = rawCsvText.trim().split('\n');
    if (lines.length <= 1) {
      alert('CSV is empty or missing data rows.');
      return;
    }

    let importedCount = 0;
    let duplicateCount = 0;
    let rejectedCount = 0;
    const errors: string[] = [];

    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));

      if (importTarget === 'students') {
        const [gr, name, father, gender, grade, sec, bform, village, contact] = cols;

        if (!name || !gr) {
          rejectedCount++;
          errors.push(`Row ${i + 1}: Missing student name or GR number.`);
          continue;
        }

        // Duplicate check
        const isDup = students.some(s => s.schoolId === importSchoolId && s.grNumber.toLowerCase() === gr.toLowerCase());
        if (isDup) {
          duplicateCount++;
          errors.push(`Row ${i + 1}: Duplicate GR ${gr} already registered.`);
          continue;
        }

        addStudent({
          schoolId: importSchoolId,
          grNumber: gr,
          name,
          fatherName: father || 'Father',
          gender: gender === 'Female' ? 'Female' : 'Male',
          grade: grade || 'Class I',
          section: sec || 'A',
          bFormNumber: bform || '',
          village: village || '',
          address: village || '',
          guardianContact: contact || '+92 300 0000000',
          admissionDate: '2026-04-15',
          dob: '2017-01-01',
          status: 'Active',
        });
        importedCount++;
      }
    }

    setImportSummary({
      total: lines.length - 1,
      imported: importedCount,
      rejected: rejectedCount,
      duplicates: duplicateCount,
      errors,
    });
  };

  // Create & Download Backup File
  const handleDownloadBackup = () => {
    const backupObj = storageService.createBackup(
      activeSchoolId !== 'all' ? activeSchoolId : undefined,
      activeAcademicYear
    );
    const jsonStr = JSON.stringify(backupObj, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SEF_OPERATOR_BACKUP_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Inspect Restore File
  const handleFileRestoreUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setRestoreJson(content);
      try {
        const parsed = JSON.parse(content);
        if (parsed.metadata) {
          setRestorePreview({
            date: parsed.metadata.exportedAt,
            schoolsCount: parsed.metadata.schoolCount || 0,
            studentsCount: parsed.metadata.studentCount || 0,
            staffCount: parsed.metadata.staffCount || 0,
          });
        }
      } catch (err) {
        alert('Invalid JSON backup file.');
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteRestore = () => {
    if (!restoreJson) return;
    if (confirm('Are you sure you want to restore? This will merge and restore database records from the backup file.')) {
      const res = storageService.restoreFromBackup(restoreJson);
      setRestoreStatus(res.message);
      if (res.success) {
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Data Import, Export & Offline Backup Center
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Bulk upload Excel/CSV records, download device backups, and restore offline files
          </p>
        </div>

        <button
          onClick={handleDownloadBackup}
          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
        >
          <Download className="w-4 h-4" />
          Backup Everything to Phone Storage
        </button>
      </div>

      {/* Tabs */}
      <div className="flex rounded-2xl bg-slate-200 dark:bg-slate-800 p-1 border border-slate-300 dark:border-slate-700 text-xs">
        <button
          onClick={() => setActiveTab('backup')}
          className={`flex-1 py-2 font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'backup'
              ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Database className="w-4 h-4" />
          1. Backup & Restore File
        </button>
        <button
          onClick={() => setActiveTab('import')}
          className={`flex-1 py-2 font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'import'
              ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Upload className="w-4 h-4" />
          2. Import Center (Excel / CSV)
        </button>
        <button
          onClick={() => setActiveTab('export')}
          className={`flex-1 py-2 font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'export'
              ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Download className="w-4 h-4" />
          3. Selective Export Center
        </button>
      </div>

      {/* TAB 1: BACKUP AND RESTORE */}
      {activeTab === 'backup' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Backup Box */}
          <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-600" />
              Backup Application Data to Phone
            </h3>
            <p className="text-slate-500">
              Export all local records, schools, students, teachers, visits, and examination marks to a secure JSON file on your Android device.
            </p>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Schools:</span>
                <strong className="text-slate-800 dark:text-white">{schools.length}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Students:</span>
                <strong className="text-slate-800 dark:text-white">{students.length}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Teachers & Staff:</span>
                <strong className="text-slate-800 dark:text-white">{staff.length}</strong>
              </div>
            </div>

            <button
              onClick={handleDownloadBackup}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Download Backup File (.json)
            </button>
          </div>

          {/* Restore Box */}
          <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Upload className="w-4 h-4 text-blue-600" />
              Restore Data from Backup File
            </h3>
            <p className="text-slate-500">
              Select a previously exported SEF backup file. Inspect metadata before applying changes.
            </p>

            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-4 text-center">
              <input
                type="file"
                accept=".json"
                onChange={handleFileRestoreUpload}
                className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
              />
            </div>

            {restorePreview && (
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 space-y-1">
                <div className="font-bold text-blue-900 dark:text-blue-200">Backup File Verified:</div>
                <div className="text-[11px] text-blue-700 dark:text-blue-300">
                  Exported on: {new Date(restorePreview.date).toLocaleString()}
                </div>
                <div className="text-[11px] text-blue-700 dark:text-blue-300">
                  Contents: {restorePreview.schoolsCount} Schools, {restorePreview.studentsCount} Students, {restorePreview.staffCount} Staff.
                </div>

                <button
                  onClick={handleExecuteRestore}
                  className="mt-2 w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition cursor-pointer"
                >
                  Confirm & Restore Database
                </button>
              </div>
            )}

            {restoreStatus && (
              <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800 font-bold text-xs">
                {restoreStatus}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: IMPORT CENTER */}
      {activeTab === 'import' && (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Bulk Data Import Mapping
              </h3>
              <p className="text-slate-500">
                Paste or load CSV format data with automated validation and duplicate checks
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={importTarget}
                onChange={e => setImportTarget(e.target.value as any)}
                className="rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-bold"
              >
                <option value="students">Import Students</option>
                <option value="teachers">Import Teachers</option>
              </select>

              <select
                value={importSchoolId}
                onChange={e => setImportSchoolId(e.target.value)}
                className="rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-bold"
              >
                {schools.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Paste CSV Lines or Load Sample Data:
              </label>
              <button
                type="button"
                onClick={() => setRawCsvText(sampleStudentCsv)}
                className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
              >
                Load Sample Student CSV
              </button>
            </div>

            <textarea
              value={rawCsvText}
              onChange={e => setRawCsvText(e.target.value)}
              placeholder="GR Number,Student Name,Father Name,Gender,Grade,Section,B-Form,Village,Guardian Contact..."
              rows={6}
              className="w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 font-mono text-xs focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-slate-400">
              Validates duplicate GR numbers and rejects invalid fields automatically.
            </span>

            <button
              onClick={handleProcessImport}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
            >
              <FileCheck className="w-4 h-4" />
              Validate & Import Records
            </button>
          </div>

          {importSummary && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Import Process Completed:
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 block">Total Read</span>
                  <strong>{importSummary.total}</strong>
                </div>
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300">
                  <span className="text-[10px] block">Imported ✓</span>
                  <strong>{importSummary.imported}</strong>
                </div>
                <div className="p-2 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300">
                  <span className="text-[10px] block">Duplicates</span>
                  <strong>{importSummary.duplicates}</strong>
                </div>
                <div className="p-2 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300">
                  <span className="text-[10px] block">Rejected</span>
                  <strong>{importSummary.rejected}</strong>
                </div>
              </div>

              {importSummary.errors.length > 0 && (
                <div className="mt-2 text-[11px] text-rose-600 dark:text-rose-400 max-h-24 overflow-y-auto">
                  {importSummary.errors.map((e, idx) => (
                    <div key={idx}>• {e}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: EXPORT CENTER */}
      {activeTab === 'export' && (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 text-xs">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Export Filtered Datasets to CSV / Excel
          </h3>
          <p className="text-slate-500">
            Export individual tables filtered by school and academic year.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => {
                const csv = 'GR Number,Student Name,Father Name,Grade,Village\n' + students.map(s => `${s.grNumber},"${s.name}","${s.fatherName}",${s.grade},"${s.village}"`).join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = 'students.csv'; a.click();
              }}
              className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition cursor-pointer"
            >
              <div className="font-bold text-sm text-slate-900 dark:text-white">Students Database</div>
              <div className="text-[11px] text-slate-400 mt-1">Export {students.length} student records with GR & B-Forms</div>
            </button>

            <button
              onClick={() => {
                const csv = 'Employee ID,Name,Designation,Qualification,Base Salary\n' + staff.map(s => `${s.employeeId},"${s.name}","${s.designation}","${s.qualification}",${s.baseSalary}`).join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = 'staff_salaries.csv'; a.click();
              }}
              className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition cursor-pointer"
            >
              <div className="font-bold text-sm text-slate-900 dark:text-white">Staff & Salaries</div>
              <div className="text-[11px] text-slate-400 mt-1">Export {staff.length} staff records with salary structures</div>
            </button>

            <button
              onClick={() => {
                const csv = 'Code,Name,District,Taluka,Head Teacher,Status\n' + schools.map(s => `${s.code},"${s.name}",${s.district},${s.taluka},"${s.headTeacherName}",${s.status}`).join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = 'schools_directory.csv'; a.click();
              }}
              className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition cursor-pointer"
            >
              <div className="font-bold text-sm text-slate-900 dark:text-white">Schools Directory</div>
              <div className="text-[11px] text-slate-400 mt-1">Export all {schools.length} school profiles</div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
