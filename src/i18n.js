import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

const EN_MESSAGES = {
  appTitle: 'Salvation Ministries (Home of Success)',
  language: 'Language',
  login: 'Login',
  register: 'Register',
  backToHome: 'Back to Home',
  hfCentersLeaders: 'HF Centers / HF Leaders',
  branches: 'Branches',
  announcements: 'Announcements',
  serviceSchedule: 'Service Schedule',
  locateNearest: 'Locate a Fellowship Center nearest you',
  locateSequence: 'Select your location in sequence: Country, State, then City/County/LGA.',
  country: 'Country',
  state: 'State',
  cityCountyLga: 'City/County/LGA',
  selectCountry: 'Select Country',
  selectState: 'Select State',
  selectCityCountyLga: 'Select City/County/LGA',
  hfLeadersSelectedCity: 'HF Leaders in your selected city',
  loadingApprovedHfLeaders: 'Loading approved HF Leaders...',
  name: 'Name',
  phoneNumber: 'Phone Number',
  residentialAddress: 'Residential Address',
  noApprovedHfLeader: 'No approved HF Leader was found in this area yet. Please',
  registerBecomeHfLeader: 'Register and become a HF Leader',
  branchPastorsChurchAddresses: 'Branch Pastors and Church Addresses',
  loadingApprovedBranchPastors: 'Loading approved Branch Pastors...',
  branchPastor: 'Branch Pastor',
  churchAddress: 'Church Address',
  noApprovedBranchPastor: 'No approved Branch Pastor record was found in this area.',
  announcementsTitle: 'Announcements',
  announcement1: 'Weekly home fellowship begins by 6:00 PM local time.',
  announcement2: 'City leaders meeting holds every first Saturday of the month.',
  announcement3: 'Keep your contact profile updated in your account dashboard.',
  serviceScheduleTitle: 'Service Schedule',
  service1: 'Sunday Celebration Service: 7:00 AM and 9:00 AM',
  service2: 'Midweek Service: Wednesday 5:30 PM',
  service3: 'Home Fellowship: Friday 6:00 PM',
  registrationSubmitted: 'Registration Submitted',
  registrationPending: 'Your registration has been submitted and is pending approval.',
  loginWithTempCredentials: 'You can login with the following temporary credentials:',
  memberAccountReady: 'Your Member account is active. You can log in immediately.',
  usernameEmail: 'Username (Email):',
  temporaryPassword: 'Temporary Password:',
  credentialsAutofilled: 'Username and temporary password have been autofilled. Please login.',
  memberDashboard: 'Member Dashboard',
  email: 'Email',
  role: 'Role',
  logout: 'Logout',
  registerHeading: 'Register',
  registerMeAs: 'Register me as a',
  selectRole: 'Select role...',
  fullName: 'Full Name',
  emailAddress: 'Email Address',
  countryOfResidence: 'Country of Residence',
  phoneNo: 'Phone No.',
  addressOfBranch: 'Address of Branch',
  addressOfStateHeadquarters: 'Address of State Headquarters',
  securityQuestion: 'Security Question',
  securityAnswer: 'Security Answer',
  selectQuestion: 'Select a question...',
  securityNote: 'Note: The security question helps secure your account. The answer is not case sensitive and ignores spaces. It will be required to reset your password if you lose access.',
  registering: 'Registering...',
  registerAsRole: 'Register as a {role}',
  backToLogin: 'Back to Login',
  pleaseSelectSecurity: 'Please select a security question and provide an answer.',
  pleaseEnterBranchAddress: 'Please enter the address of the branch.',
  pleaseEnterStateHqAddress: 'Please enter the address of the state headquarters.',
  registrationFailed: 'Registration failed',
  registrationError: 'Registration error: {message}',
  hfLeaderRole: 'HF Leader',
  branchPastorRole: 'Branch Pastor',
  statePastorRole: 'State Pastor',
  loginHeading: 'Login',
  setOwnPassword: 'Set your own password',
  forgotPasswordHeading: 'Forgot Password',
  password: 'Password',
  setNewPassword: 'Set New Password',
  confirmNewPassword: 'Confirm New Password',
  answer: 'Answer',
  resetPasswordProceed: 'Reset Password & Proceed',
  resetPassword: 'Reset Password',
  forgotPassword: 'Forgot Password?',
  cancelReset: 'Cancel Reset',
  fetchingSecurityQuestion: 'Fetching security question...',
  enterEmailForSecurityQuestion: 'Enter your email address to load your security question.',
  securityQuestionNotFound: 'No security question was found for this email address.',
  securityAnswerRequired: 'Please answer your security question.',
  emailRequired: 'Please enter your email address.',
  firstLoginResetPrompt: 'Create your own password to manage your account.',
  passwordsDoNotMatch: 'Passwords do not match.',
  passwordResetSuccessful: 'Password reset successful!',
  passwordResetFailed: 'Password reset failed',
  securityQuestionLabel: 'Security Question:',
  loginFailed: 'Login failed',
  loginError: 'Login error: {message}',
  pendingApplications: 'Pending Applications',
  loadingPendingApprovals: 'Loading pending approvals...',
  noPendingApplications: 'No pending applications to approve.',
  applied: 'Applied',
  approve: 'Approve',
  reject: 'Reject',
  enterRejectionReason: 'Enter rejection reason:',
  loadingApprovalStatus: 'Loading approval status...',
  approvalPending: 'Approval pending',
  approvedByOn: 'Approved by {approvedBy} ({approvedByRole}) on {approvedAt}',
  applicationRejected: 'Your application for the role of {requestedRole} on {appliedAt} was rejected on {approvedAt}.',
  meetBranchPastor: 'Please meet your branch pastor for guidance.',
  sq1: 'What is your mother’s maiden name?',
  sq2: 'What was the name of your first pet?',
  sq3: 'What was your first school?',
  sq4: 'What is your favorite book?',
  sq5: 'What city were you born in?',
  sq6: 'What is your favorite food?',
  sq7: 'What is your father’s middle name?',
  sq8: 'What was your childhood nickname?',
  sq9: 'What is your favorite color?',
  sq10: 'What is the name of your best friend?',
  // Admin dashboard
  adminTabApprovals: 'Pending Applications',
  adminTabAnnouncements: 'Announcements',
  adminTabSchedule: 'Service Schedule',
  newAnnouncementPlaceholder: 'Type a new announcement...',
  addAnnouncement: 'Add',
  noAnnouncements: 'No announcements posted yet.',
  newSchedulePlaceholder: 'e.g. Sunday Service: 7:00 AM',
  addSchedule: 'Add',
  noSchedule: 'No service schedule entries yet.',
  save: 'Save',
  cancel: 'Cancel',
  edit: 'Edit',
  delete: 'Delete',
  confirmDelete: 'Are you sure you want to delete this item?',
  fetchError: 'Failed to fetch data.',
  saveFailed: 'Failed to save.',
  deleteFailed: 'Failed to delete.'
  ,
  adminTabPostManual: 'Post HF Manual',
  adminTabPostGuide: 'Post HF Guide',
  adminTabDocuments: 'Documents',
  adminTabAttendance: 'Attendance',
  adminTabRelocations: 'Relocation Applications',
  adminTabStats: 'View Stats',
  manualTopicPlaceholder: 'Topic',
  topic: 'Topic',
  date: 'Date',
  manualRequiredFields: 'Topic, date and content are required.',
  savingDoc: 'Saving...',
  publishDoc: 'Post Document',
  publishedDocuments: 'Published Documents',
  noDocumentsPublished: 'No documents published yet.',
  downloadCount: 'Download Count',
  uniqueUsers: 'Unique Users',
  noStatsYet: 'No stats available yet.',
  loadingDocuments: 'Loading documents...',
  latestManualPosted: 'Latest HF Manual Posted',
  latestGuidePosted: 'Latest HF Guide Posted',
  hfManualsForDownload: 'HF Manuals',
  noManualsYet: 'No HF manuals available yet.',
  hfGuidesForDownload: 'HF Guides',
  noGuidesYet: 'No HF guides available yet.',
  downloadPdf: 'Download PDF',
  downloadsUsed: 'Downloads used',
  loadingManuals: 'Loading manuals...',
  downloadFailed: 'Download failed.',
  totalAttendance: 'Total Attendance',
  maleAdults: 'Male Adults',
  femaleAdults: 'Female Adults',
  children: 'Children',
  noPendingRelocations: 'No pending relocation applications.',
  importantStats: 'Important Stats',
  totalHfCenters: 'Total HF Centers',
  totalBranches: 'Total Branches',
  totalHfMembers: 'Total HF Members',
  totalHfAttendanceForWeek: 'Total HF Attendance for the Week',
  totalCountriesChurchIsIn: 'Total Countries the Church is in',
  scopeGlobal: 'Scope: Global record',
  scopeState: 'Scope: Your state jurisdiction',
  scopeBranch: 'Scope: Your branch jurisdiction',
  // Settings
  settings: 'Settings',
  settingsTitle: 'Settings',
  editProfile: 'Edit Profile',
  profileUpdated: 'Profile updated successfully.',
  profileUpdateFailed: 'Failed to update profile.',
  saveChanges: 'Save Changes',
  colorTheme: 'Color Theme',
  themeDefault: 'Default Blue',
  themePurple: 'Purple',
  themeOrange: 'Orange',
  themeDarkPink: 'Dark Pink',
  themeGreen: 'Green',
  themeBlue: 'Blue',
  themeDarkBlue: 'Dark Blue',
  themeBlack: 'Black',
  themeGold: 'Gold',
  themeGray: 'Gray',
  languageSettings: 'Language Settings',
  memberRole: 'Member',
  themeHint: 'Tip: You can customize the app\'s color theme in ⚙ Settings — try it out!',
  dismissHint: 'Got it',
  residentialAddress: 'Residential Address',
  fullName: 'Full Name',
  attendanceSummaryForMember: 'Your Attendance Summary',
  timesAttended: 'Times Attended',
  attendancePercentage: 'Attendance Percentage',
  yourHfLeader: 'Your HF Leader is:',
  phoneNumberIs: 'and phone number is:',
  attendanceTicks: 'Attendance Ticks In Your Favor',
  noAttendanceTicks: 'No attendance has been ticked in your favor yet.',
  noAssignedHfLeader: 'No HF Leader has been assigned to your account yet.',
  loadingMemberSummary: 'Loading your attendance summary...'
};

const SECURITY_QUESTION_KEYS = ['sq1', 'sq2', 'sq3', 'sq4', 'sq5', 'sq6', 'sq7', 'sq8', 'sq9', 'sq10'];
const LOCALE_STORAGE_KEY = 'hf_locale';

const I18nContext = createContext(null);

function formatMessage(template, values = {}) {
  return Object.entries(values).reduce(
    (message, [key, value]) => message.replaceAll(`{${key}}`, value ?? ''),
    template
  );
}

export function TranslationProvider({ children }) {
  const [locale, setLocale] = useState(() => {
    try {
      return localStorage.getItem(LOCALE_STORAGE_KEY) || 'en-US';
    } catch {
      return 'en-US';
    }
  });
  const [messages, setMessages] = useState(EN_MESSAGES);
  const cacheRef = useRef({ 'en-US': EN_MESSAGES });

  useEffect(() => {
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      // Ignore storage failures.
    }
  }, [locale]);

  useEffect(() => {
    let cancelled = false;

    const loadTranslations = async () => {
      if (locale === 'en-US') {
        setMessages(EN_MESSAGES);
        return;
      }

      if (cacheRef.current[locale]) {
        setMessages(cacheRef.current[locale]);
        return;
      }

      try {
        const res = await fetch('/api/translate/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            locale,
            messages: EN_MESSAGES
          })
        });
        const data = await res.json();
        if (!cancelled && res.ok && data.messages) {
          cacheRef.current[locale] = data.messages;
          setMessages(data.messages);
        }
      } catch (err) {
        if (!cancelled) {
          setMessages(EN_MESSAGES);
        }
      }
    };

    loadTranslations();
    return () => {
      cancelled = true;
    };
  }, [locale]);

  const value = useMemo(() => ({
    locale,
    setLocale,
    t: (key, values) => formatMessage(messages[key] || EN_MESSAGES[key] || key, values),
    securityQuestions: SECURITY_QUESTION_KEYS.map((key) => ({ key, text: messages[key] || EN_MESSAGES[key] })),
    roleLabels: {
      'Member': messages.memberRole || EN_MESSAGES.memberRole,
      'HF Leader': messages.hfLeaderRole || EN_MESSAGES.hfLeaderRole,
      'Branch Pastor': messages.branchPastorRole || EN_MESSAGES.branchPastorRole,
      'State Pastor': messages.statePastorRole || EN_MESSAGES.statePastorRole
    }
  }), [locale, messages]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within TranslationProvider');
  }
  return context;
}
