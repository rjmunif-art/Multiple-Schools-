export type UserRole = 'operator' | 'headTeacher' | 'head_teacher' | 'supervisor';
export type AuthProviderType = 'credentials' | 'google' | 'phone' | 'email' | 'linked';

export interface ActiveDevice {
  deviceId: string;
  userId: string;
  deviceName: string;
  platform: string; // e.g. 'Android', 'iOS', 'Web Desktop', 'Mobile Chrome'
  appVersion: string;
  lastActiveAt: string;
  createdAt: string;
  lastSyncAt?: string;
  isCurrent?: boolean;
}

export interface UserAccount {
  id: string; // Internal stable user_id (Firebase UID)
  username: string;
  name: string;
  email?: string;
  phone?: string; // Canonical phone number
  role: UserRole;
  pin?: string; // Security PIN
  schoolId?: string; // If headTeacher, assigned school ID
  assignedSchoolIds?: string[]; // If operator, assigned school IDs (or all schools)
  organizationName?: string; // Institute/Organization name
  instituteName?: string; // Institute/Organization name
  degree?: string; // Educational degree
  photoData?: string; // Base64 compressed image (max 256x256 JPEG)
  profileCompleted?: boolean; // Profile completion flag
  operatorUid?: string; // If headTeacher, the operator who invited them
  authProvider?: AuthProviderType;
  googleUid?: string; // Stable Google sub/ID
  phoneVerified?: boolean;
  emailVerified?: boolean;
  googleVerified?: boolean;
  photoUrl?: string;
  profilePic?: string;
  status?: 'active' | 'suspended' | 'pending';
  lastLoginAt?: string;
  createdAt: string;
  updatedAt?: string;
  devices?: ActiveDevice[];
}

export interface SchoolInvite {
  email: string; // lowercase email
  name?: string;
  phone?: string;
  schoolId: string;
  schoolName?: string;
  operatorUid: string;
  operatorName?: string;
  createdAt: string;
}

export interface AssistantChat {
  id: string;
  schoolId: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssistantChatMessage {
  id: string;
  chatId: string;
  userId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  structuredAction?: {
    type: 'add_students' | 'add_teachers' | 'update_student' | 'update_teacher' | 'mark_attendance' | 'record_fee_payment' | 'create_announcement';
    data: any;
    status: 'pending' | 'confirmed' | 'cancelled';
  };
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  userName: string;
  action: 'login_credentials' | 'login_google' | 'login_phone' | 'register' | 'link_google' | 'link_phone' | 'change_phone' | 'sync_push' | 'sync_pull' | 'logout' | 'device_registered' | 'device_revoked' | 'data_restored';
  schoolId?: string;
  recordId?: string;
  details?: string;
  deviceId?: string;
  timestamp: string;
}

export interface School {
  id: string;
  code: string; // e.g. SEF-DAD-101
  name: string; // e.g. Dua Public School
  programType: 'PIMS' | 'EVS' | 'SEF-Middle' | 'SAS' | 'Integrated';
  district: string; // e.g. Dadu, Khairpur, Badin
  taluka: string; // e.g. Sehwan, Gambat
  uc: string; // Union Council
  village: string;
  address: string;
  ownerUid?: string; // Firebase UID of the operator who owns this school
  headTeacherUid?: string; // Firebase UID of the assigned head teacher
  headTeacherEmail?: string; // Google Email of the assigned head teacher
  gpsCoordinates?: {
    lat: number;
    lng: number;
  };
  headTeacherId?: string;
  headTeacherName: string;
  contactNumber: string;
  establishedDate: string;
  grades: string[]; // e.g. ["Kachi", "Class I", "Class II", "Class III", "Class IV", "Class V"]
  shift: 'Morning' | 'Afternoon' | 'Double Shift';
  status: 'active' | 'attention' | 'critical' | 'inactive';
  facilities: {
    drinkingWater: boolean;
    toilets: boolean;
    boundaryWall: boolean;
    electricity: boolean;
    solarPower: boolean;
    library: boolean;
    computerLab: boolean;
    playground: boolean;
    furnitureAdequate: boolean;
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type StudentStatus = 'Active' | 'Transferred' | 'Withdrawn' | 'Passed' | 'Dropout' | 'Inactive';

export interface StudentPhotoRecord {
  id: string;
  url: string;
  academicYear: string;
  uploadedDate: string;
  notes?: string;
}

export interface Student {
  id: string;
  schoolId: string;
  grNumber: string; // General Register Number
  name: string;
  fatherName: string;
  motherName?: string;
  gender: 'Male' | 'Female';
  dob: string;
  bFormNumber: string;
  grade: string; // e.g. "Class III"
  section: string; // e.g. "A"
  admissionDate: string;
  previousSchool?: string;
  status: StudentStatus;
  guardianContact: string;
  address: string;
  village: string;
  profilePic?: string; // Current / Active Base64 or URL
  photoHistory?: StudentPhotoRecord[]; // SEF annual historical student profile photos archive
  passedOutDate?: string; // Date when student graduated/passed out
  formBPic?: string; // Photo of Form-B
  fatherNicPic?: string; // Photo of Father CNIC (Legacy / Front)
  fatherNicFrontPic?: string; // Photo of Father CNIC Front Side
  fatherNicBackPic?: string; // Photo of Father CNIC Back Side
  motherCnic?: string; // Mother CNIC number
  motherNicPic?: string; // Photo of Mother CNIC (Legacy / Front)
  motherNicFrontPic?: string; // Photo of Mother CNIC Front Side
  motherNicBackPic?: string; // Photo of Mother CNIC Back Side
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export type StaffDesignation = 'Head Teacher' | 'Senior Teacher' | 'Junior Teacher' | 'ECE Teacher' | 'Peon' | 'Aya' | 'Security Guard';
export type StaffStatus = 'Active' | 'Leave' | 'Absent' | 'Transferred' | 'Resigned' | 'Inactive';

export interface Staff {
  id: string;
  schoolId: string;
  employeeId: string;
  name: string;
  cnic: string;
  qualification: string;
  subject?: string;
  designation: StaffDesignation;
  joiningDate: string;
  resignationDate?: string; // Retained in school history
  resignationReason?: string;
  contact: string;
  status: StaffStatus;
  assignedGrade?: string;
  assignedSubject?: string;
  baseSalary: number; // PKR monthly
  profilePic?: string;
  cnicFrontPic?: string;
  cnicBackPic?: string;
  appointmentLetterPic?: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PayrollRecord {
  id: string;
  staffId: string;
  schoolId: string;
  month: string; // YYYY-MM
  academicYear: string;
  baseSalary: number;
  allowances: {
    travel?: number;
    hardship?: number;
    special?: number;
  };
  deductions: {
    unexcusedAbsenceDays: number;
    absenceDeduction: number;
    tax?: number;
    other?: number;
  };
  netSalary: number;
  paymentStatus: 'Paid' | 'Processing' | 'Pending';
  paymentDate?: string;
  paymentMethod?: 'Cash' | 'Bank Transfer' | 'EasyPaisa' | 'JazzCash' | 'Cheque';
  receiptVoucherNo?: string;
  headTeacherApprovalStatus?: 'Pending Confirmation' | 'Confirmed Received' | 'Disputed';
  headTeacherApprovalDate?: string;
  headTeacherApprovalRemarks?: string;
  headTeacherApprovedBy?: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentDailyAttendance {
  id: string;
  schoolId: string;
  date: string; // YYYY-MM-DD
  academicYear: string;
  grade: string;
  totalStudents: number;
  present: number;
  absent: number;
  leave: number;
  late?: number;
  attendancePercentage: number;
  records?: {
    studentId: string;
    status: 'present' | 'absent' | 'leave' | 'late';
  }[];
  submittedBy: string;
  createdAt: string;
}

export interface StaffDailyAttendance {
  id: string;
  schoolId: string;
  date: string; // YYYY-MM-DD
  academicYear: string;
  staffId: string;
  status: 'Present' | 'Absent' | 'Leave' | 'Late';
  timeIn?: string;
  timeOut?: string;
  remarks?: string;
  createdAt: string;
}

export interface Examination {
  id: string;
  name: string; // e.g. "Annual Examination 2026", "Midterm Assessment"
  academicYear: string;
  examType: 'Annual' | 'Midterm' | 'Monthly' | 'Unit' | 'Diagnostic';
  startDate: string;
  endDate: string;
  subjects: string[];
  passingPercentage: number; // default 33
  isPublished: boolean;
}

export interface ExamMark {
  id: string;
  examinationId: string;
  schoolId: string;
  studentId: string;
  grade: string;
  academicYear: string;
  subjectMarks: {
    subject: string;
    totalMarks: number;
    obtainedMarks: number;
  }[];
  totalMaxMarks: number;
  totalObtainedMarks: number;
  percentage: number;
  passed: boolean;
  gradeLetter: string; // A+, A, B, C, D, F
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChecklistItem {
  id: string;
  category: string;
  title: string;
  status: 'satisfactory' | 'needs_improvement' | 'unsatisfactory' | 'not_applicable';
  remarks?: string;
  photoUrl?: string;
}

export interface SchoolVisit {
  id: string;
  schoolId: string;
  date: string;
  arrivalTime: string;
  departureTime: string;
  visitorName: string;
  visitType: 'Regular Monitoring' | 'Surprise Inspection' | 'SEF Official Visit' | 'Assessment Visit' | 'Special Follow-up' | (string & {});
  purpose: string;
  headTeacherPresent: boolean;
  teachersPresentCount: number;
  teachersTotalCount: number;
  studentsPresentCount: number;
  studentsEnrollmentCount: number;
  headCount?: number; // Physical Head Count conducted during monitoring visit
  headCountVariance?: number; // Difference between register attendance and actual physical head count
  headCountRemarks?: string;
  classroomObservation: string;
  teachingQualityRating: 1 | 2 | 3 | 4 | 5;
  studentLearningRating: 1 | 2 | 3 | 4 | 5;
  cleanlinessRating: 1 | 2 | 3 | 4 | 5;
  registersUpToDate: boolean;
  checklist: ChecklistItem[];
  issuesFound: string[];
  actionsRequired: string;
  followUpDate?: string;
  gpsCoordinates?: {
    lat: number;
    lng: number;
  };
  photos: string[];
  remarks: string;
  createdAt: string;
}

export interface SchoolIssue {
  id: string;
  schoolId: string;
  date: string;
  category: 'Infrastructure' | 'Staffing' | 'Student Attendance' | 'Academic Quality' | 'SEF Compliance' | 'Community/Parental' | 'Supplies/Books';
  description: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  responsiblePerson: string;
  deadline: string;
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  actionTaken?: string;
  followUpDate?: string;
  evidencePhoto?: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SchoolTask {
  id: string;
  schoolId: string;
  title: string;
  description?: string;
  assignedTo: string;
  createdDate: string;
  dueDate: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  status: 'Today' | 'Overdue' | 'Upcoming' | 'Completed';
  completedDate?: string;
  remarks?: string;
}

export interface SchoolDocument {
  id: string;
  schoolId: string;
  title: string;
  category: 'SEF Agreement' | 'Land/Building Record' | 'Staff Record' | 'Student Record' | 'Monitoring Report' | 'Inspection Certificate' | 'Photo Archive' | 'Financial/Receipt';
  uploadDate: string;
  fileType: string;
  fileSize: string;
  fileUrl: string; // Data URL or asset path
  notes?: string;
}

export interface SystemNotification {
  id: string;
  type: 'attendance' | 'task' | 'issue' | 'visit' | 'result' | 'sync' | 'payroll';
  title: string;
  message: string;
  schoolId?: string;
  date: string;
  isRead: boolean;
}

export interface AppSettings {
  academicYear: string;
  availableAcademicYears: string[];
  attendanceThresholds: {
    criticalBelow: number; // e.g. 80
    attentionBelow: number; // e.g. 90
  };
  passingPercentage: number; // default 33
  healthScoreFormula: {
    attendanceWeight: number; // e.g. 35
    teacherAttendanceWeight: number; // e.g. 25
    examResultsWeight: number; // e.g. 20
    monitoringWeight: number; // e.g. 10
    issuesPenaltyWeight: number; // e.g. 10
  };
  theme: 'light' | 'dark' | 'system';
  language: 'en' | 'ur' | 'sd';
  syncIntervalMinutes: number;
  offlineSimulation: boolean;
}

export type SyncState = 'synced' | 'syncing' | 'pending' | 'error';
