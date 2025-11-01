
import React from 'react';
import type { Feature, TeamMember, Notice, Note, SyllabusEntry, SubscriptionPlan, QuizCategory, MCQQuestion, MCQCategoryStructure, MainQuizCategory, UpcomingFeatureData, AdditionalFeatureData, SliderImage } from './types';
import {
  BookOpenIcon,
  QuestionMarkCircleIcon,
  PencilSquareIcon,
  CpuChipIcon,
  GlobeAltIcon,
  ClipboardDocumentCheckIcon,
  NewspaperIcon,
  UserGroupIcon,
  CloudArrowDownIcon,
  ArrowPathRoundedSquareIcon,
  CalculatorIcon as OutlineCalculatorIcon,
  VideoCameraIcon,
  Cog6ToothIcon as OutlineCog6ToothIcon,
  BuildingOffice2Icon as OutlineBuildingOffice2Icon,
  AcademicCapIcon as OutlineAcademicCapIcon,
  BriefcaseIcon,
  SparklesIcon as OutlineSparklesIcon,
  TicketIcon as OutlineTicketIcon,
} from '@heroicons/react/24/outline';
import {
    EnvelopeIcon as SolidEnvelopeIcon,
    LockClosedIcon as SolidLockClosedIcon,
    UserIcon as SolidUserIcon,
    ClipboardDocumentListIcon as SolidClipboardDocumentListIcon,
    Squares2X2Icon as SolidSquares2X2Icon,
    PhotoIcon as SolidPhotoIcon,
    DocumentArrowDownIcon as SolidDocumentArrowDownIcon,
    CameraIcon as SolidCameraIcon,
    MicrophoneIcon as SolidMicrophoneIcon,
    UserCircleIcon as SolidUserCircleIcon,
    ArrowRightOnRectangleIcon as SolidArrowRightOnRectangleIcon,
} from '@heroicons/react/24/solid';


// Icons as functional components
export const BookIcon: React.FC<{className?: string}> = ({className}) => (<BookOpenIcon className={className} />);
export const QuizIcon: React.FC<{className?: string}> = ({className}) => (<QuestionMarkCircleIcon className={className} />);
export const NotesIcon: React.FC<{className?: string}> = ({className}) => (<PencilSquareIcon className={className} />);
export const BrainIcon: React.FC<{className?: string}> = ({className}) => (<CpuChipIcon className={className} />);
export const GlobeIcon: React.FC<{className?: string}> = ({className}) => (<GlobeAltIcon className={className} />);
export const ExamIcon: React.FC<{className?: string}> = ({className}) => (<ClipboardDocumentCheckIcon className={className} />);
export const DocumentIcon: React.FC<{className?: string}> = ({className}) => (<NewspaperIcon className={className} />);
export const UserGroupIconComponent: React.FC<{className?: string}> = ({className}) => (<UserGroupIcon className={className} />);
export const OfflineIcon: React.FC<{className?: string}> = ({className}) => (<CloudArrowDownIcon className={className} />);
export const ConverterIcon: React.FC<{className?: string}> = ({className}) => (<ArrowPathRoundedSquareIcon className={className} />);
export const CalculatorIcon: React.FC<{className?: string}> = ({className}) => (<OutlineCalculatorIcon className={className} />);
export const VideoIcon: React.FC<{className?: string}> = ({className}) => (<VideoCameraIcon className={className} />);
export const Cog6ToothIcon: React.FC<{className?: string}> = ({className}) => (<OutlineCog6ToothIcon className={className} />);
export const BuildingOffice2Icon: React.FC<{className?: string}> = ({className}) => (<OutlineBuildingOffice2Icon className={className} />);
export const SparklesIcon: React.FC<{className?: string}> = ({className}) => (<OutlineSparklesIcon className={className} />);
export const AcademicCapIcon: React.FC<{className?: string}> = ({className}) => (<OutlineAcademicCapIcon className={className} />);
export const BriefcaseIconComponent: React.FC<{className?: string}> = ({className}) => (<BriefcaseIcon className={className} />);
export const TicketIcon: React.FC<{className?: string}> = ({className}) => (<OutlineTicketIcon className={className} />);
export const PhotoIcon: React.FC<{className?: string}> = ({className}) => (<SolidPhotoIcon className={className} />);
export const EnvelopeIcon: React.FC<{className?: string}> = ({className}) => (<SolidEnvelopeIcon className={className} />);
export const LockClosedIcon: React.FC<{className?: string}> = ({className}) => (<SolidLockClosedIcon className={className} />);
export const UserIcon: React.FC<{className?: string}> = ({className}) => (<SolidUserIcon className={className} />);
export const ClipboardDocumentListIcon: React.FC<{className?: string}> = ({className}) => (<SolidClipboardDocumentListIcon className={className} />);
export const Squares2X2Icon: React.FC<{className?: string}> = ({className}) => (<SolidSquares2X2Icon className={className} />);
export const DocumentArrowDownIcon: React.FC<{className?: string}> = ({className}) => (<SolidDocumentArrowDownIcon className={className} />);
export const CameraIcon: React.FC<{className?: string}> = ({className}) => (<SolidCameraIcon className={className} />);
export const MicrophoneIcon: React.FC<{className?: string}> = ({className}) => (<SolidMicrophoneIcon className={className} />);
export const UserCircleIcon: React.FC<{className?: string}> = ({className}) => (<SolidUserCircleIcon className={className} />);
export const ArrowRightOnRectangleIcon: React.FC<{className?: string}> = ({className}) => (<SolidArrowRightOnRectangleIcon className={className} />);


export const FacebookIcon: React.FC<{className?: string}> = ({className}) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"></path></svg>);
export const InstagramIcon: React.FC<{className?: string}> = ({className}) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.85s-.011 3.584-.069 4.85c-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07s-3.584-.012-4.85-.07c-3.252-.148-4.771-1.691-4.919-4.919-.058-1.265-.07-1.645-.07-4.85s.012-3.584.07-4.85c.148-3.225 1.664-4.771 4.919-4.919C8.416 2.175 8.796 2.163 12 2.163zm0 1.441c-3.161 0-3.52.012-4.75.07-2.67.122-3.812 1.258-3.927 3.927-.058 1.23-.07 1.59-.07 4.75s.012 3.52.07 4.75c.115 2.67 1.257 3.806 3.927 3.927 1.23.058 1.59.07 4.75.07s3.52-.012 4.75-.07c2.67-.122 3.812-1.258 3.927-3.927.058-1.23.07-1.59.07-4.75s-.012-3.52-.07-4.75c-.115-2.67-1.257-3.806-3.927-3.927-1.23-.058-1.59-.07-4.75-.07zm0 4.398c-2.209 0-4 1.79-4 4s1.791 4 4 4 4-1.79 4-4-1.791-4-4-4zm0 6.562c-1.414 0-2.562-1.148-2.562-2.562s1.148-2.562 2.562-2.562 2.562 1.148 2.562 2.562-1.148 2.562-2.562 2.562zm4.406-6.875c-.622 0-1.125.503-1.125 1.125s.503 1.125 1.125 1.125 1.125-.503 1.125-1.125-.503-1.125-1.125-1.125z"></path></svg>);
export const YouTubeIcon: React.FC<{className?: string}> = ({className}) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M21.582 7.243c-.23-.835-.89-1.495-1.725-1.725-1.533-.418-7.694-.418-7.694-.418s-6.161 0-7.694.418c-.835.23-1.495.89-1.725 1.725-.418 1.533-.418 4.757-.418 4.757s0 3.224.418 4.757c.23.835.89 1.495 1.725 1.725 1.533.418 7.694.418 7.694.418s6.161 0 7.694.418c.835-.23 1.495-.89 1.725-1.725.418-1.533.418-4.757.418-4.757s0-3.224-.418-4.757zm-11.59 6.54V9.217l4.333 2.288-4.333 2.288z"></path></svg>);
export const TwitterIcon: React.FC<{className?: string}> = ({className}) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>);
export const LinkedInIcon: React.FC<{className?: string}> = ({className}) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.25 6.5 1.75 1.75 0 016.5 8.25zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0013 14.19a.66.66 0 000 .14V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.55 0 3.36.86 3.36 3.66z"></path></svg>);
export const GoogleIcon: React.FC<{className?: string}> = ({className}) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className={className}><path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"></path><path fill="#FF3D00" d="m6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"></path><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A8 8 0 0 1 24 36c-6.627 0-12-5.373-12-12h-8c0 6.627 5.373 12 12 12z"></path><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C44.591 35.091 48 29.833 48 24c0-1.341-.138-2.65-.389-3.917z"></path></svg>);
export const EyeIcon: React.FC<{className?: string}> = ({className}) => (<svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542 7z" /></svg>);
export const EyeOffIcon: React.FC<{className?: string}> = ({className}) => (<svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>);

export const ICONS_MAP: { [key: string]: React.FC<{className?: string}> } = {
  BookIcon,
  QuizIcon,
  NotesIcon,
  BrainIcon,
  GlobeIcon,
  ExamIcon,
  DocumentIcon,
  UserGroupIcon: UserGroupIconComponent,
  OfflineIcon,
  ConverterIcon,
  CalculatorIcon,
  VideoIcon,
  Cog6ToothIcon,
  BuildingOffice2Icon,
  SparklesIcon,
  AcademicCapIcon: AcademicCapIcon,
  BriefcaseIcon: BriefcaseIconComponent,
  TicketIcon,
  ClipboardDocumentListIcon,
  ClipboardDocumentCheckIcon,
  Squares2X2Icon,
  PhotoIcon,
  DocumentArrowDownIcon,
  CameraIcon,
  MicrophoneIcon,
  UserCircleIcon,
};
export const ICON_KEYS = Object.keys(ICONS_MAP);

export const TAILWIND_COLORS = [
  'bg-slate-500', 'bg-gray-500', 'bg-zinc-500', 'bg-neutral-500', 'bg-stone-500',
  'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500', 'bg-lime-500',
  'bg-green-500', 'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-sky-500',
  'bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500',
  'bg-pink-500', 'bg-rose-500'
];
export const TAILWIND_TEXT_COLORS = TAILWIND_COLORS.map(c => c.replace('bg-', 'text-'));

export interface DefaultService {
    name: string;
    iconKey: string;
    path: string;
    color: string; // Tailwind text color class
    order: number;
    key: string; // A unique key for firestore doc id
    badgeText?: string;
    badgeColor?: string;
}

export const DEFAULT_SERVICES: DefaultService[] = [
  { name: 'Syllabus', iconKey: 'BookIcon', path: '/syllabus', color: 'text-blue-500', order: 1, key: 'syllabus' },
  { name: 'Quiz', iconKey: 'QuizIcon', path: '/quiz', color: 'text-green-500', order: 2, key: 'quiz' },
  { name: 'Notes', iconKey: 'NotesIcon', path: '/notes', color: 'text-yellow-500', order: 3, key: 'notes' },
  { name: 'IQ Questions', iconKey: 'BrainIcon', path: '/iq-questions', color: 'text-purple-500', order: 4, key: 'iq-questions' },
  { name: 'GK Questions', iconKey: 'GlobeIcon', path: '/gk-questions', color: 'text-red-500', order: 5, key: 'gk-questions' },
  { name: 'MCQ Test', iconKey: 'ExamIcon', path: '/mcq-test', color: 'text-indigo-500', order: 6, key: 'mcq-test' },
  { name: 'Notices', iconKey: 'DocumentIcon', path: '/notices', color: 'text-teal-500', order: 7, key: 'notices', badgeText: 'New', badgeColor: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
  { name: 'AI Interview', iconKey: 'UserGroupIcon', path: '/ai-interview', color: 'text-pink-500', order: 8, key: 'ai-interview', badgeText: '35', badgeColor: 'bg-yellow-300 text-yellow-900 dark:bg-yellow-700 dark:text-yellow-200' },
  { name: 'Offline Test', iconKey: 'OfflineIcon', path: '/offline-test', color: 'text-gray-500', order: 9, key: 'offline-test' },
];


export const UPCOMING_FEATURES: UpcomingFeatureData[] = [
    { name: 'Live Classes', key: 'live-classes', iconKey: 'VideoIcon', enabled: true },
    { name: 'Mentorship', key: 'mentorship', iconKey: 'BrainIcon', enabled: true },
    { name: 'Job Alerts', key: 'job-alerts', iconKey: 'DocumentIcon', enabled: true },
    { name: 'E-Library', key: 'e-library', iconKey: 'BookIcon', enabled: true },
];

export const ADDITIONAL_FEATURES: AdditionalFeatureData[] = [
    { name: 'Keep Notes', key: 'keep-notes', iconKey: 'NotesIcon', path: '/keep-notes', enabled: true },
    { name: 'Questions Practice', key: 'questions-practice', iconKey: 'ExamIcon', path: '/questions-practice', enabled: true },
    { name: 'Unit Converter', key: 'unit-converter', iconKey: 'ConverterIcon', path: '/unit-converter', enabled: true },
    { name: 'Eng. Calculator', key: 'eng-calculator', iconKey: 'CalculatorIcon', path: '/eng-calculator', enabled: true },
    { name: 'Video Summarize', key: 'video-summarize', iconKey: 'VideoIcon', path: '/video-summarize', enabled: true },
];

export const OUR_TEAM: TeamMember[] = [
    {
        id: 'kishan-raut',
        order: 1,
        name: 'Kishan Raut',
        position: 'CEO/Designer',
        description: 'Leading the vision and design of our platform.',
        photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop',
        social: { facebook: '#', instagram: '#', twitter: '#' },
        portfolioUrl: '#'
    },
    {
        id: 'roshni-giri',
        order: 2,
        name: 'Roshni Giri',
        position: 'App Management',
        description: 'Managing app development and user experience.',
        photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop',
        social: { facebook: '#', instagram: '#', twitter: '#' },
        portfolioUrl: '#'
    }
];
export const MOCKED_NOTICES: Notice[] = [
    { id: 'mock-notice-1', title: 'Exam routine for Section Officer has been published.', date: '2024-05-20', fileUrl: '#', type: 'our' },
    { id: 'mock-notice-2', title: 'Vacancy announcement for Computer Engineer.', date: '2024-05-18', fileUrl: '#', type: 'our' },
    { id: 'mock-notice-3', title: 'Result of written examination for Kharidar.', date: '2024-05-15', fileUrl: '#', type: 'our' }
];

export const MOCKED_PSC_NOTICES: Notice[] = [
    { id: 'mock-psc-1', title: 'Vacancy for various posts in Rastriya Banijya Bank.', date: '2024-05-19', fileUrl: '#', type: 'psc' },
    { id: 'mock-psc-2', title: 'PSC Exam Center for Sub-Engineer.', date: '2024-05-17', fileUrl: '#', type: 'psc' },
    { id: 'mock-psc-3', title: 'Interview schedule for Section Officer.', date: '2024-05-16', fileUrl: '#', type: 'psc' }
];

export const MOCKED_SYLLABUS_DATA: SyllabusEntry[] = [
    { id: 'mock-syllabus-1', date: '2024-01-15', title: 'Syllabus for Section Officer (General Administration)', source: 'Public Service Commission', fileUrl: '#' },
    { id: 'mock-syllabus-2', date: '2024-01-12', title: 'Syllabus for Computer Engineer (IT Group)', source: 'Public Service Commission', fileUrl: '#' },
    { id: 'mock-syllabus-3', date: '2024-01-10', title: 'Syllabus for Kharidar (Non-Gazetted First Class)', source: 'Public Service Commission', fileUrl: '#' },
    { id: 'mock-syllabus-4', date: '2023-12-28', title: 'Syllabus for Na. Su. (Administration)', source: 'PSC', fileUrl: '#' },
    { id: 'mock-syllabus-5', date: '2023-12-25', title: 'Syllabus for Staff Nurse (Health Services)', source: 'Public Service Commission', fileUrl: '#' }
];

export const MOCKED_NOTES: Note[] = [
    { id: 'mock-note-1', title: 'History of Nepal - Ancient Period', date: '2024-04-10', category: 'gk', fileUrl: '#' },
    { id: 'mock-note-2', title: 'Civil Service Act, 2049 - Key Points', date: '2024-04-08', category: 'admin', fileUrl: '#' },
    { id: 'mock-note-3', title: 'Constitution of Nepal - Fundamental Rights', date: '2024-04-05', category: 'law', fileUrl: '#' },
    { id: 'mock-note-4', title: 'Fluid Mechanics - Important Formulas', date: '2024-04-02', category: 'engineering', fileUrl: '#' }
];

export const LOKSEWA_COURSES = [
    "Section Officer", "Computer Engineer", "Civil Engineer", "Kharidar", "Na. Su.", "Staff Nurse", "Anusandhan Sahayak", "Vetenary"
];

export const NOTE_CATEGORIES = {
    all: 'All Notes',
    gk: 'GK',
    admin: 'Administration',
    law: 'Law',
    engineering: 'Engineering'
};


export const QUIZ_SETTINGS = {
    TIME_LIMIT_SECONDS: 20,
    PASSING_SCORE_PERCENTAGE: 50,
};


export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
    { name: 'Basic', price: 'Free', features: ['Limited Quizzes', 'Access to Notes', 'Community Support'] },
    { name: 'Pro', price: 'NPR 500/mo', features: ['Unlimited Quizzes', 'Ad-Free Experience', 'AI Interview Practice', 'Exclusive Content'], popular: true },
    { name: 'Premium', price: 'NPR 5000/yr', features: ['All Pro features', 'Personalized Mentorship', 'Live Classes'], bestValue: true }
];

// This structure is now fetched from Firestore. This serves as a fallback.
export const MCQ_CATEGORIES: MCQCategoryStructure = [
    {
        id: 'engineering',
        title: "Engineering",
        iconKey: "Cog6ToothIcon",
        color: "bg-blue-500",
        key: 'engineering',
        subCategories: [
            { key: 'civil', name: "Civil", iconKey: 'BuildingOffice2Icon', description: "Quizzes on civil engineering topics.", color: "bg-blue-500" },
            { key: 'computer', name: "Computer", iconKey: 'CpuChipIcon', description: "Quizzes on computer engineering topics.", color: "bg-green-500" },
            { key: 'electrical', name: "Electrical", iconKey: 'SparklesIcon', description: "Quizzes on electrical engineering.", color: "bg-yellow-500" },
        ],
    },
    {
        id: 'health',
        title: "Health",
        iconKey: "AcademicCapIcon",
        color: "bg-red-500",
        key: 'health',
        subCategories: [
            { key: 'staff-nurse', name: "Staff Nurse", iconKey: 'UserGroupIcon', description: "Practice for Staff Nurse exams.", color: "bg-red-500" },
            { key: 'ha', name: "Health Assistant", iconKey: 'BriefcaseIcon', description: "Quizzes for Health Assistants.", color: "bg-pink-500" },
        ],
    },
];

// Deprecated. Will be removed once fully migrated to Firestore-based MCQ system.
export const OLD_QUIZ_CATEGORIES: QuizCategory[] = [
    { name: 'GK (General Knowledge)', icon: <GlobeIcon />, description: 'National and international affairs.', path: '/mcq-test', color: 'bg-red-500', key: 'gk' },
    { name: 'IQ (Intelligence Quotient)', icon: <BrainIcon />, description: 'Logical and analytical reasoning.', path: '/mcq-test', color: 'bg-purple-500', key: 'iq' },
    { name: 'Administration', icon: <BriefcaseIconComponent />, description: 'Related to public administration.', path: '/mcq-test', color: 'bg-blue-500', key: 'admin' },
    { name: 'Engineering', icon: <Cog6ToothIcon />, description: 'For various engineering disciplines.', path: '/mcq-test', color: 'bg-yellow-500', key: 'engineering' }
];

export const MOCKED_QUESTIONS: MCQQuestion[] = [
    { id: 1, question: 'What is the capital of Nepal?', options: ['Pokhara', 'Kathmandu', 'Butwal', 'Biratnagar'], correctOptionIndex: 1, explanation: "Kathmandu is the capital city of Nepal, located in the Kathmandu Valley." },
    { id: 2, question: 'Which of the following is NOT a programming language?', options: ['Python', 'HTML', 'Java', 'C++'], correctOptionIndex: 1, explanation: "HTML is a markup language used for creating web pages, not a programming language." },
    { id: 3, question: 'Who is the first person to climb Mount Everest?', options: ['Tenzing Norgay', 'Edmund Hillary', 'Both A and B', 'None of the above'], correctOptionIndex: 2, explanation: "Tenzing Norgay and Edmund Hillary were the first two individuals to reach the summit of Mount Everest on 29 May 1953." },
];

export const DEFAULT_SLIDER_IMAGES: SliderImage[] = [
    {
        imageUrl: 'https://images.unsplash.com/photo-1511497584788-876760111969?q=80&w=1332&auto=format&fit=crop',
        altText: 'Loksewa preparation books and materials',
        linkUrl: '/notes',
    },
    {
        imageUrl: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=1484&auto=format&fit=crop',
        altText: 'Group of students studying together for exams',
        linkUrl: '/quiz',
    },
    {
        imageUrl: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?q=80&w=1374&auto=format&fit=crop',
        altText: 'Person taking an online test on a laptop',
        linkUrl: '/mcq-test',
    },
];