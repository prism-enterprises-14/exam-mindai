import fs from "fs";
import path from "path";

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: "STUDENT" | "EDUCATOR" | "RESEARCHER" | "ADMIN";
  academicLevel: "PRIMARY" | "SECONDARY" | "HIGHER_SECONDARY" | "DIPLOMA" | "UNDERGRADUATE" | "POSTGRADUATE" | "RESEARCH";
  learningGoals?: string;
  preferredSubject?: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  category: string;
  teachingMode: string;
  academicLevel: string;
  isPinned: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Citation {
  documentName: string;
  pageNumber: number;
  section?: string;
  excerpt: string;
  confidenceScore?: number;
  sourceUrl?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  reasoningSteps?: string[];
  citations?: Citation[];
  feedback?: "LIKE" | "DISLIKE" | null;
  tokensUsed?: number;
  modelUsed?: string;
  createdAt: string;
  attachments?: { type: string; data: string; name: string }[];
  verificationBadge?: string;
}

export interface Document {
  id: string;
  userId: string;
  name: string;
  fileType: string;
  fileSize: number;
  url?: string;
  pageCount: number;
  status: "PROCESSING" | "READY" | "ERROR";
  createdAt: string;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  chunkIndex: number;
  pageNumber: number;
  sectionTitle?: string;
  content: string;
  embedding?: number[];
  createdAt: string;
}

export interface QuizQuestion {
  id: string;
  type: "MCQ" | "TRUE_FALSE" | "FILL_BLANK" | "SHORT_ANSWER";
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  topic?: string;
}

export interface Quiz {
  id: string;
  userId: string;
  title: string;
  subject: string;
  topic: string;
  difficulty: "Easy" | "Medium" | "Hard" | "Olympiad";
  academicLevel: string;
  timeLimitMinutes: number;
  questions: QuizQuestion[];
  sourceDocumentId?: string;
  createdAt: string;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  userId: string;
  score: number;
  maxScore: number;
  timeTakenSeconds: number;
  answers: Array<{
    questionId: string;
    userAnswer: string;
    isCorrect: boolean;
  }>;
  analysis?: {
    masteryPercentage: number;
    strongTopics: string[];
    weakTopics: string[];
    recommendations: string[];
  };
  completedAt: string;
}

export interface LearningProgress {
  id: string;
  userId: string;
  subject: string;
  topic: string;
  masteryLevel: number; // 0-100
  questionsAnswered: number;
  streakDays: number;
  lastActiveAt: string;
}

export interface StudyMaterial {
  id: string;
  userId: string;
  title: string;
  type: "NOTES" | "FLASHCARDS" | "REVISION" | "MINDMAP" | "FORMULASHEET";
  subject: string;
  content: string;
  createdAt: string;
}

export interface SystemConfig {
  activeModel: string;
  inferenceBaseUrl: string;
  hasApiKey: boolean;
  contextLength: number;
  maxOutputTokens: number;
  temperature: number;
  topP: number;
  fallbackModel: string;
  isHealthy: boolean;
  lastHealthCheck: string;
  // Specific Dual Model Configurations (Requirement 1 & 12)
  gptOssBaseUrl?: string;
  gptOssApiKey?: string;
  gptOssModel?: string;
  qwenBaseUrl?: string;
  qwenApiKey?: string;
  qwenModel?: string;
  searchProviderUrl?: string;
}

// Persistent Storage Layer with fallback to local JSON DB
const DATA_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "db.json");

interface DatabaseSchema {
  users: Record<string, User>;
  conversations: Record<string, Conversation>;
  messages: Record<string, Message>;
  documents: Record<string, Document>;
  documentChunks: Record<string, DocumentChunk>;
  quizzes: Record<string, Quiz>;
  quizAttempts: Record<string, QuizAttempt>;
  learningProgress: Record<string, LearningProgress>;
  studyMaterials: Record<string, StudyMaterial>;
  systemConfig: SystemConfig;
}

const DEFAULT_USER: User = {
  id: "user-academic-default",
  email: "scholar@exammind.ai",
  name: "Academic Scholar",
  role: "STUDENT",
  academicLevel: "UNDERGRADUATE",
  preferredSubject: "Computer Science & Mathematics",
  learningGoals: "Master quantum computing, distributed systems, and real analysis",
  createdAt: new Date().toISOString(),
};

// 100% Online URL API connectivity for seamless Vercel deployment (Zero local dependencies)
const DEFAULT_CONFIG: SystemConfig = {
  activeModel: process.env.GPT_OSS_MODEL || process.env.INFERENCE_MODEL || "gpt-oss",
  inferenceBaseUrl: process.env.GPT_OSS_BASE_URL || process.env.INFERENCE_BASE_URL || "https://text.pollinations.ai",
  hasApiKey: false,
  contextLength: 32768,
  maxOutputTokens: 4096,
  temperature: 0.2,
  topP: 0.9,
  fallbackModel: process.env.QWEN_MODEL || "qwen-oss",
  isHealthy: true,
  lastHealthCheck: new Date().toISOString(),
  gptOssBaseUrl: process.env.GPT_OSS_BASE_URL || process.env.INFERENCE_BASE_URL || "https://text.pollinations.ai",
  gptOssApiKey: process.env.GPT_OSS_API_KEY || "",
  gptOssModel: process.env.GPT_OSS_MODEL || "openai-fast",
  qwenBaseUrl: process.env.QWEN_BASE_URL || process.env.INFERENCE_BASE_URL || "https://text.pollinations.ai",
  qwenApiKey: process.env.QWEN_API_KEY || "",
  qwenModel: process.env.QWEN_MODEL || "qwen-coder",
  searchProviderUrl: process.env.SEARCH_PROVIDER_URL || process.env.SEARXNG_URL || "",
};

function getInitialDB(): DatabaseSchema {
  const calculusDoc: Document = {
    id: "doc-calculus-101",
    userId: DEFAULT_USER.id,
    name: "University Calculus & Real Analysis.pdf",
    fileType: "pdf",
    fileSize: 48200,
    pageCount: 32,
    status: "READY",
    createdAt: new Date().toISOString(),
  };

  const physicsDoc: Document = {
    id: "doc-physics-201",
    userId: DEFAULT_USER.id,
    name: "Principles of Quantum Physics & Electrodynamics.pdf",
    fileType: "pdf",
    fileSize: 56400,
    pageCount: 48,
    status: "READY",
    createdAt: new Date().toISOString(),
  };

  const csDoc: Document = {
    id: "doc-os-301",
    userId: DEFAULT_USER.id,
    name: "Operating Systems: Concurrency & Virtual Memory.pdf",
    fileType: "pdf",
    fileSize: 62100,
    pageCount: 54,
    status: "READY",
    createdAt: new Date().toISOString(),
  };

  return {
    users: { [DEFAULT_USER.id]: DEFAULT_USER },
    conversations: {},
    messages: {},
    documents: {
      [calculusDoc.id]: calculusDoc,
      [physicsDoc.id]: physicsDoc,
      [csDoc.id]: csDoc,
    },
    documentChunks: {
      "chunk-calc-1": {
        id: "chunk-calc-1",
        documentId: calculusDoc.id,
        chunkIndex: 0,
        pageNumber: 14,
        sectionTitle: "Techniques of Integration & Parts",
        content: "Integration by parts formula is derived from the product rule: \\int u dv = uv - \\int v du. For definite integrals over [a, b], \\int_a^b u v' dx = [u(x)v(x)]_a^b - \\int_a^b u' v dx. Common strategy LIATE (Logarithmic, Inverse trig, Algebraic, Trigonometric, Exponential) assists in choosing u.",
        createdAt: new Date().toISOString(),
      },
      "chunk-calc-2": {
        id: "chunk-calc-2",
        documentId: calculusDoc.id,
        chunkIndex: 1,
        pageNumber: 28,
        sectionTitle: "Taylor & Maclaurin Series",
        content: "A function f(x) with infinitely many derivatives at a is represented by Taylor series: f(x) = \\sum_{n=0}^{\\infty} \\frac{f^{(n)}(a)}{n!} (x - a)^n. Key expansions: e^x = \\sum \\frac{x^n}{n!}, \\sin x = \\sum (-1)^n \\frac{x^{2n+1}}{(2n+1)!}, \\cos x = \\sum (-1)^n \\frac{x^{2n}}{(2n)!}.",
        createdAt: new Date().toISOString(),
      },
      "chunk-phys-1": {
        id: "chunk-phys-1",
        documentId: physicsDoc.id,
        chunkIndex: 0,
        pageNumber: 21,
        sectionTitle: "Schrödinger Wave Mechanics & State Vectors",
        content: "The time-dependent Schrödinger equation governing a quantum particle is i\\hbar \\frac{\\partial \\psi}{\\partial t} = \\hat{H}\\psi. For time-independent potentials V(x), the stationary state satisfies -\\frac{\\hbar^2}{2m} \\nabla^2 \\psi + V(x)\\psi = E\\psi. The probability density is |\\psi(x,t)|^2 with normalization \\int |\\psi|^2 d^3r = 1.",
        createdAt: new Date().toISOString(),
      },
      "chunk-phys-2": {
        id: "chunk-phys-2",
        documentId: physicsDoc.id,
        chunkIndex: 1,
        pageNumber: 35,
        sectionTitle: "Quantum Harmonic Oscillator",
        content: "In the quantum harmonic oscillator with potential V(x) = \\frac{1}{2}m\\omega^2x^2, the energy eigenvalues are discrete: E_n = (n + \\frac{1}{2})\\hbar\\omega for n = 0, 1, 2, ... The ground state energy E_0 = \\frac{1}{2}\\hbar\\omega is the zero-point energy, required by Heisenberg's Uncertainty Principle \\Delta x \\Delta p \\ge \\frac{\\hbar}{2}.",
        createdAt: new Date().toISOString(),
      },
      "chunk-cs-1": {
        id: "chunk-cs-1",
        documentId: csDoc.id,
        chunkIndex: 0,
        pageNumber: 42,
        sectionTitle: "Virtual Memory & Page Replacement",
        content: "Virtual memory decouples logical address space from physical RAM using page tables and the Translation Lookaside Buffer (TLB). When page faults occur, page replacement algorithms choose victim pages: Optimal (Belady's min), Least Recently Used (LRU), and Clock (Second-Chance). Belady's anomaly occurs in FIFO but never in stack-based algorithms like LRU.",
        createdAt: new Date().toISOString(),
      },
    },
    quizzes: {},
    quizAttempts: {},
    learningProgress: {
      "prog-1": {
        id: "prog-1",
        userId: DEFAULT_USER.id,
        subject: "Mathematics",
        topic: "Linear Algebra & Matrices",
        masteryLevel: 88,
        questionsAnswered: 42,
        streakDays: 5,
        lastActiveAt: new Date().toISOString(),
      },
      "prog-2": {
        id: "prog-2",
        userId: DEFAULT_USER.id,
        subject: "Computer Science",
        topic: "Algorithms & Complexity",
        masteryLevel: 76,
        questionsAnswered: 35,
        streakDays: 5,
        lastActiveAt: new Date().toISOString(),
      },
      "prog-3": {
        id: "prog-3",
        userId: DEFAULT_USER.id,
        subject: "Physics",
        topic: "Quantum Mechanics & Waves",
        masteryLevel: 74,
        questionsAnswered: 19,
        streakDays: 3,
        lastActiveAt: new Date().toISOString(),
      },
    },
    studyMaterials: {},
    systemConfig: DEFAULT_CONFIG,
  };
}

let memoryDB: DatabaseSchema | null = null;

function loadDB(): DatabaseSchema {
  if (memoryDB) return memoryDB;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      memoryDB = JSON.parse(data);
      // Ensure systemConfig has valid URL
      if (!memoryDB!.systemConfig.inferenceBaseUrl) {
        memoryDB!.systemConfig = DEFAULT_CONFIG;
      }
      return memoryDB!;
    }
  } catch (e) {
    console.warn("Falling back to in-memory database store:", e);
  }
  memoryDB = getInitialDB();
  saveDB();
  return memoryDB;
}

function saveDB() {
  if (!memoryDB) return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tempFile = `${DB_FILE}.${Date.now()}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(memoryDB, null, 2), "utf-8");
    fs.renameSync(tempFile, DB_FILE);
  } catch (e) {
    console.warn("Could not write to disk, keeping in memory:", e);
  }
}

// User operations
export async function getDefaultUser(): Promise<User> {
  const db = loadDB();
  return db.users[DEFAULT_USER.id] || DEFAULT_USER;
}

export async function updateUser(updates: Partial<User>): Promise<User> {
  const db = loadDB();
  const current = db.users[DEFAULT_USER.id] || DEFAULT_USER;
  db.users[DEFAULT_USER.id] = { ...current, ...updates };
  saveDB();
  return db.users[DEFAULT_USER.id];
}

// Conversation operations
export async function getConversations(userId: string = DEFAULT_USER.id): Promise<Conversation[]> {
  const db = loadDB();
  return Object.values(db.conversations)
    .filter((c) => c.userId === userId && !c.isArchived)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export async function getConversation(id: string): Promise<Conversation | null> {
  const db = loadDB();
  return db.conversations[id] || null;
}

export async function createConversation(params: {
  userId?: string;
  title: string;
  category?: string;
  teachingMode?: string;
  academicLevel?: string;
}): Promise<Conversation> {
  const db = loadDB();
  const id = "conv-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7);
  const conv: Conversation = {
    id,
    userId: params.userId || DEFAULT_USER.id,
    title: params.title || "Academic Session",
    category: params.category || "General Academic",
    teachingMode: params.teachingMode || "DETAILED_EXPLANATION",
    academicLevel: params.academicLevel || "UNDERGRADUATE",
    isPinned: false,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.conversations[id] = conv;
  saveDB();
  return conv;
}

export async function updateConversation(
  id: string,
  updates: Partial<Conversation>
): Promise<Conversation | null> {
  const db = loadDB();
  if (!db.conversations[id]) return null;
  db.conversations[id] = {
    ...db.conversations[id],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  saveDB();
  return db.conversations[id];
}

export async function deleteConversation(id: string): Promise<boolean> {
  const db = loadDB();
  if (db.conversations[id]) {
    delete db.conversations[id];
    Object.keys(db.messages).forEach((msgId) => {
      if (db.messages[msgId].conversationId === id) {
        delete db.messages[msgId];
      }
    });
    saveDB();
    return true;
  }
  return false;
}

// Message operations
export async function getMessages(conversationId: string): Promise<Message[]> {
  const db = loadDB();
  return Object.values(db.messages)
    .filter((m) => m.conversationId === conversationId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export async function addMessage(params: {
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  reasoningSteps?: string[];
  citations?: Citation[];
  tokensUsed?: number;
  modelUsed?: string;
  attachments?: { type: string; data: string; name: string }[];
  verificationBadge?: string;
}): Promise<Message> {
  const db = loadDB();
  const id = "msg-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7);
  const message: Message = {
    id,
    conversationId: params.conversationId,
    role: params.role,
    content: params.content,
    reasoningSteps: params.reasoningSteps,
    citations: params.citations,
    feedback: null,
    tokensUsed: params.tokensUsed || 0,
    modelUsed: params.modelUsed || "ExamMind AI (CoralGenz Global)",
    createdAt: new Date().toISOString(),
    attachments: params.attachments,
    verificationBadge: params.verificationBadge,
  };
  db.messages[id] = message;

  if (db.conversations[params.conversationId]) {
    db.conversations[params.conversationId].updatedAt = new Date().toISOString();
  }

  saveDB();
  return message;
}

export async function updateMessageFeedback(id: string, feedback: "LIKE" | "DISLIKE" | null) {
  const db = loadDB();
  if (db.messages[id]) {
    db.messages[id].feedback = feedback;
    saveDB();
    return db.messages[id];
  }
  return null;
}

// Documents & RAG operations
export async function getDocuments(userId: string = DEFAULT_USER.id): Promise<Document[]> {
  const db = loadDB();
  return Object.values(db.documents)
    .filter((d) => d.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function saveDocument(doc: Document, chunks: DocumentChunk[]) {
  const db = loadDB();
  db.documents[doc.id] = doc;
  chunks.forEach((chunk) => {
    db.documentChunks[chunk.id] = chunk;
  });
  saveDB();
}

export async function deleteDocument(id: string) {
  const db = loadDB();
  delete db.documents[id];
  Object.keys(db.documentChunks).forEach((chunkId) => {
    if (db.documentChunks[chunkId].documentId === id) {
      delete db.documentChunks[chunkId];
    }
  });
  saveDB();
}

export async function getDocumentChunks(documentIds?: string[]): Promise<DocumentChunk[]> {
  const db = loadDB();
  const allChunks = Object.values(db.documentChunks);
  if (!documentIds || documentIds.length === 0) return allChunks;
  return allChunks.filter((c) => documentIds.includes(c.documentId));
}

// Quizzes operations
export async function getQuizzes(userId: string = DEFAULT_USER.id): Promise<Quiz[]> {
  const db = loadDB();
  return Object.values(db.quizzes)
    .filter((q) => q.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getQuiz(id: string): Promise<Quiz | null> {
  const db = loadDB();
  return db.quizzes[id] || null;
}

export async function saveQuiz(quiz: Quiz) {
  const db = loadDB();
  db.quizzes[quiz.id] = quiz;
  saveDB();
  return quiz;
}

export async function saveQuizAttempt(attempt: QuizAttempt) {
  const db = loadDB();
  db.quizAttempts[attempt.id] = attempt;
  saveDB();
  return attempt;
}

export async function getQuizAttempts(userId: string = DEFAULT_USER.id): Promise<QuizAttempt[]> {
  const db = loadDB();
  return Object.values(db.quizAttempts)
    .filter((a) => a.userId === userId)
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
}

// Learning Progress operations
export async function getLearningProgress(userId: string = DEFAULT_USER.id): Promise<LearningProgress[]> {
  const db = loadDB();
  return Object.values(db.learningProgress).filter((p) => p.userId === userId);
}

export async function recordLearningActivity(params: {
  userId?: string;
  subject: string;
  topic: string;
  scoreGain?: number;
}) {
  const db = loadDB();
  const userId = params.userId || DEFAULT_USER.id;
  const existingKey = Object.keys(db.learningProgress).find((k) => {
    const item = db.learningProgress[k];
    return item.userId === userId && item.subject.toLowerCase() === params.subject.toLowerCase();
  });

  if (existingKey) {
    const item = db.learningProgress[existingKey];
    item.questionsAnswered += 1;
    if (params.scoreGain) {
      item.masteryLevel = Math.min(100, item.masteryLevel + params.scoreGain);
    }
    item.lastActiveAt = new Date().toISOString();
  } else {
    const id = "prog-" + Date.now();
    db.learningProgress[id] = {
      id,
      userId,
      subject: params.subject,
      topic: params.topic,
      masteryLevel: Math.min(100, 50 + (params.scoreGain || 10)),
      questionsAnswered: 1,
      streakDays: 1,
      lastActiveAt: new Date().toISOString(),
    };
  }
  saveDB();
}

// Study Materials operations
export async function getStudyMaterials(userId: string = DEFAULT_USER.id): Promise<StudyMaterial[]> {
  const db = loadDB();
  return Object.values(db.studyMaterials)
    .filter((s) => s.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function saveStudyMaterial(material: StudyMaterial) {
  const db = loadDB();
  db.studyMaterials[material.id] = material;
  saveDB();
  return material;
}

export async function deleteStudyMaterial(id: string) {
  const db = loadDB();
  delete db.studyMaterials[id];
  saveDB();
}

// System Config operations
export async function getSystemConfig(): Promise<SystemConfig> {
  const db = loadDB();
  if (!db.systemConfig) {
    db.systemConfig = { ...DEFAULT_CONFIG };
    saveDB();
  }
  // Sanitize any residual localhost/11434 endpoints to online URL
  // Only sanitize localhost if deployed in cloud (Vercel) where localhost is unreachable
  if (
    process.env.VERCEL &&
    db.systemConfig.inferenceBaseUrl &&
    (db.systemConfig.inferenceBaseUrl.includes("localhost") ||
      db.systemConfig.inferenceBaseUrl.includes("127.0.0.1") ||
      db.systemConfig.inferenceBaseUrl.includes("11434"))
  ) {
    db.systemConfig.inferenceBaseUrl = "https://text.pollinations.ai";
    db.systemConfig.activeModel = "gpt-oss";
    saveDB();
  }
  return db.systemConfig;
}

export async function updateSystemConfig(updates: Partial<SystemConfig>): Promise<SystemConfig> {
  const db = loadDB();
  const sanitizedUpdates = { ...updates };
  // Only sanitize localhost if deployed in cloud (Vercel)
  if (
    process.env.VERCEL &&
    sanitizedUpdates.inferenceBaseUrl &&
    (sanitizedUpdates.inferenceBaseUrl.includes("localhost") ||
      sanitizedUpdates.inferenceBaseUrl.includes("127.0.0.1") ||
      sanitizedUpdates.inferenceBaseUrl.includes("11434"))
  ) {
    sanitizedUpdates.inferenceBaseUrl = "https://text.pollinations.ai";
  }
  db.systemConfig = { ...db.systemConfig, ...sanitizedUpdates, lastHealthCheck: new Date().toISOString() };
  saveDB();
  return db.systemConfig;
}
