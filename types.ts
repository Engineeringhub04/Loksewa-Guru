import React from 'react';

export interface Service {
  name: string;
  icon: React.ReactNode;
  path: string;
}

export interface Notice {
    id: string;
    title: string;
    date: string;
    fileUrl: string;
    type: 'our' | 'psc';
    createdAt?: Date;
    imageUrl?: string;
}

export interface Note {
    id: string;
    title: string;
    date: string;
    fileUrl: string;
    category: 'gk' | 'admin' | 'law' | 'engineering';
    createdAt?: Date;
}

// Redefined OfflineTest to support interactive offline quizzes
export interface OfflineTest {
  id: string;
  title: string;
  description: string;
  status: 'published' | 'draft';
  createdAt: Date;
  updatedAt: Date;
  questions: Omit<MCQQuestion, 'id'>[];
  settings: {
    timeLimitMinutes: number;
    passingScore: number;
    displayQuestions?: number;
    randomizeQuestions: boolean;
    randomizeOptions: boolean;
    showResultsImmediately: boolean;
    allowMultipleAttempts: boolean;
    showExplanation: boolean;
  };
}

export interface LocalNote {
  id: string;
  title: string;
  content: string;
  lastModified: number;
  style?: {
    backgroundColor?: string;
    backgroundImage?: string;
    backgroundSize?: string;
  };
}

export interface LocalTodo {
  id: string;
  title: string;
  time: string; // "HH:mm" format
  completed: boolean;
}

export interface Feature {
    name: string;
    iconKey: string;
}

export interface TeamMember {
    id: string;
    order: number;
    name: string;
    position: string;
    description: string;
    photoUrl: string;
    deleteToken?: string;
    social: {
        facebook: string;
        instagram: string;
        twitter: string;
    };
    portfolioUrl?: string;
}

export interface SyllabusEntry {
    id: string;
    date: string;
    title: string;
    source: string;
    fileUrl: string;
    createdAt?: Date;
}

export interface SubscriptionPlan {
  name: string;
  price: string;
  features: string[];
  popular?: boolean;
  bestValue?: boolean;
}

export interface QuizCategory {
  name: string;
  icon: React.ReactNode;
  description: string;
  path: string;
  color: string;
  key?: string;
}

export interface MCQQuestion {
  id?: number | string;
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation?: string;
}

export interface AuthUser {
  uid: string;
  email: string | null;
  fullName?: string;
  photoUrl?: string;
  course?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  subscriptionStatus?: 'active' | 'expired' | 'none' | 'pending' | 'failed';
  subscriptionExpiry?: Date | null;
  planName?: string;
}

// New types for nested MCQ categories
export interface SubQuizCategory {
  key: string;
  name:string;
  iconKey: string;
  description: string;
  color: string;
}

export interface MainQuizCategory {
  id: string; // Firestore document ID
  title: string;
  iconKey: string;
  color: string;
  key: string; 
  subCategories: SubQuizCategory[];
}

export type MCQCategoryStructure = MainQuizCategory[];

// Represents a single quiz document stored in Firestore
export interface QuizDocument {
  id: string;
  title: string;
  description: string;
  mainCategoryKey: string;
  subCategoryKey: string;
  subCategoryName: string;
  status: 'published' | 'draft';
  createdAt: Date;
  updatedAt: Date;
  questions: Omit<MCQQuestion, 'id'>[];
  settings: {
    timeLimitMinutes: number;
    passingScore: number;
    displayQuestions?: number;
    randomizeQuestions: boolean;
    randomizeOptions: boolean;
    showResultsImmediately: boolean;
    allowMultipleAttempts: boolean;
    showExplanation: boolean;
  };
}

// --- Types for "Questions Practice" ---
export interface PracticeCourse {
  id: string; // firestore doc id (same as key)
  key: string;
  name: string;
  iconKey: string;
  order: number;
}

export interface PracticeSet {
  id: string; // firestore doc id
  title: string;
  description: string;
  courseKey: string;
  status: 'published' | 'draft';
  createdAt: Date;
  updatedAt: Date;
  questions: Omit<MCQQuestion, 'id'>[];
  settings?: {
    displayQuestions?: number;
  };
}

// --- Types for Dynamic Content Management ---

export interface UpcomingFeatureData {
    name: string;
    key: string;
    iconKey: string;
    enabled: boolean;
}

export interface AdditionalFeatureData {
    name: string;
    key: string;
    iconKey: string;
    path: string;
    enabled: boolean;
}

export interface SocialLinks {
    facebook: string;
    instagram: string;
    youtube: string;
    twitter: string;
    linkedin: string;
    whatsapp: string;
}

// Represents the structure of the main document in the 'content' collection
export interface AppContent {
    upcomingFeatures: UpcomingFeatureData[];
    additionalFeatures: AdditionalFeatureData[];
    socialLinks: SocialLinks;
    otherSite: {
        heading: string;
        description: string;
        link: string;
    };
    generalSettings?: {
        shareUrl?: string;
    };
}

// Represents the structure of a single component in an AI-generated page layout
export interface DynamicPageComponent {
    type: 'heading' | 'paragraph' | 'input' | 'button' | 'spacer';
    props: {
        content?: string;      // Text for heading, p, button
        placeholder?: string;  // Placeholder for input
        size?: 'small' | 'medium' | 'large'; // Size for spacer
        bindToState?: string;  // State key for input value
        onClickAction?: 'alert' | 'reset'; // Action for button
        actionPayload?: string; // Payload for the action (e.g., alert message)
    };
}

// Represents the structure of an AI-generated page layout
export interface DynamicPageLayout {
    items: DynamicPageComponent[];
}

// Represents a service document stored in Firestore
export interface ServiceDocument {
    id: string;
    key: string;
    name: string;
    iconKey: string;
    path: string;
    color: string; // Tailwind text color class, e.g., 'text-blue-500'
    order: number;
    badgeText?: string;
    badgeColor?: string;
}

export interface SliderImage {
  imageUrl: string;
  altText: string;
  linkUrl: string;
}

export interface SubmittedFile {
  id: string;
  fileName: string;
  ownerName: string;
  userId?: string;
  userEmail?: string;
  category: 'Notes' | 'MCQ' | 'Other';
  message: string;
  downloadUrl: string;
  originalFileName: string;
  submittedAt: Date;
  deleteToken?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  link?: string;
  imageUrl?: string;
  author?: string;
}

export interface PublishedNotification {
  id: string;
  title: string;
  message: string;
  author: string;
  imageUrl?: string;
  publishedAt: Date;
  createdAt: Date;
  status: 'published' | 'draft';
}

export interface AdminNotification {
  id: string;
  type: 'newUser' | 'subscription' | 'fileReceive' | 'feedback';
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  link?: string;
  relatedId?: string; // e.g., userId or proofId
}

export interface PaymentProof {
  id: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  planName: string;
  paymentMethod: 'eSewa' | 'Khalti' | 'Card';
  screenshotUrl: string;
  submittedAt: Date;
  status: 'pending' | 'approved' | 'rejected';
  deleteToken?: string;
  otherSiteImageUrl?: string;
  appliedPromoCode?: string;
}

export interface OtherSiteData {
    id?: string;
    heading: string;
    description: string;
    link: string;
    imageUrl: string;
    createdAt?: Date;
}

export interface HomeNotice {
  id: string;
  imageUrl: string;
  linkUrl: string;
  createdAt: Date;
  expiresAt: Date;
  deleteToken?: string;
}

// --- AI CHAT TYPES ---
export interface ChatPart {
    text?: string;
    inlineData?: {
        mimeType: string;
        data: string;
    };
}
export interface ChatMessage {
    id: string;
    role: 'user' | 'model';
    parts: ChatPart[];
    feedback?: 'liked' | 'disliked' | null;
    error?: 'network' | 'api' | null;
}
export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number | any; // number for guests, Firestore Timestamp for users
}

export interface Feedback {
  id: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  createdAt: Date;
  status: 'new' | 'read';
  type: 'general' | 'ai_chat';
  message?: string;

  // General feedback specific
  rating?: number;
  contactAllowed?: boolean;
  joinResearch?: boolean;

  // AI chat feedback specific
  aiRating?: 'liked' | 'disliked';
  dislikeReasons?: string[];
  context?: {
    prompt: ChatMessage | null;
    response: ChatMessage;
  };
}


// --- New types for dynamic page content ---
export interface ContactPageContent {
    email: string;
    phone: string;
    address: string;
    facebook: string;
    instagram: string;
    youtube: string;
    twitter: string;
    linkedin: string;
    whatsapp: string;
}

export interface TextPageContent {
    content: string; // Can contain markdown or plain text
}

// --- New type for Promo Codes ---
export interface PromoCode {
  id: string; // The code itself, e.g., "SAVE20"
  description?: string;
  discountPercentage: number;
  expiresAt: Date;
  applicablePlans: ('Pro' | 'Premium')[];
  usageCount: number;
  maxUsage?: number; // Optional: limit total uses
  status: 'active' | 'disabled';
  createdAt: Date;
}