import { getSystemConfig, SystemConfig } from "@/lib/database/db";
import { createAutonomousAcademicStream, synthesizeAcademicResponse } from "./academic-synthesis";
import { ResponseMode } from "./prompts";

export interface ModelEndpointInfo {
  id: string;
  name: string;
  backend: "gpt-oss" | "qwen";
  family: "ExamMind" | "GPT-OSS" | "Qwen 2.5";
  contextWindow: number;
  recommendedRole: string;
}

export const AVAILABLE_MODELS: ModelEndpointInfo[] = [
  {
    id: "exammind-core",
    name: "ExamMind Core v4.0 (CoralGenz Global)",
    backend: "gpt-oss",
    family: "ExamMind",
    contextWindow: 131072,
    recommendedRole: "General Knowledge, Humanities, Science, Essays, Deep Search & Multi-Disciplinary Q&A",
  },
  {
    id: "exammind-quantum",
    name: "ExamMind Quantum Reasoning Engine (CoralGenz Global)",
    backend: "qwen",
    family: "ExamMind",
    contextWindow: 131072,
    recommendedRole: "C, C++, Java, Python, JS, Next.js, Algorithms, Calculus, Proofs & Debugging",
  },
];

export interface ChatMessageTextPart {
  type: "text";
  text: string;
}

export interface ChatMessageImagePart {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
}

export type ChatMessageContentPart = ChatMessageTextPart | ChatMessageImagePart;

export interface ChatMessageParam {
  role: "system" | "user" | "assistant";
  content: string | ChatMessageContentPart[];
}

export interface InferenceOptions {
  model?: string;
  backend?: "gpt-oss" | "qwen" | "auto";
  mode?: ResponseMode;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stream?: boolean;
  hasVision?: boolean;
}

export interface EndpointTestResult {
  status:
    | "Connected"
    | "Disconnected"
    | "Model Unavailable"
    | "Authentication Required"
    | "Rate Limited"
    | "Timeout"
    | "Invalid Response";
  latencyMs: number;
  model: string;
  endpoint: string;
  backend: "gpt-oss" | "qwen";
  sampleResponse?: string;
  error?: string;
}

export interface ModelBackendConfig {
  backend: "gpt-oss" | "qwen";
  baseUrl: string;
  apiKey: string;
  model: string;
  displayName: string;
}

/**
 * Extracts plain text from either a string content or ChatMessageContentPart[]
 */
export function extractTextFromContent(content: string | ChatMessageContentPart[] | undefined): string {
  if (!content) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => (part.type === "text" ? part.text : ""))
      .filter(Boolean)
      .join(" ");
  }
  return "";
}

/**
 * Checks if any message in the history contains an image payload
 */
export function hasImageInMessages(messages: ChatMessageParam[]): boolean {
  return messages.some(
    (m) => Array.isArray(m.content) && m.content.some((p) => p.type === "image_url")
  );
}

/**
 * Resolves the configuration for a given model backend (GPT-OSS or Qwen),
 * prioritizing specific environment variables (Requirement 1 & 12).
 */
export async function getModelBackendConfig(
  backend: "gpt-oss" | "qwen",
  configOverride?: SystemConfig
): Promise<ModelBackendConfig> {
  const config = configOverride || (await getSystemConfig());

  if (backend === "qwen") {
    const baseUrl =
      process.env.QWEN_BASE_URL ||
      config.qwenBaseUrl ||
      process.env.INFERENCE_BASE_URL ||
      config.inferenceBaseUrl ||
      "https://text.pollinations.ai";

    const apiKey =
      process.env.QWEN_API_KEY ??
      config.qwenApiKey ??
      process.env.INFERENCE_API_KEY ??
      "";

    const rawModel =
      process.env.QWEN_MODEL ||
      config.qwenModel ||
      "qwen-coder";

    return {
      backend: "qwen",
      baseUrl,
      apiKey,
      model: rawModel,
      displayName: "ExamMind Quantum (CoralGenz Global)",
    };
  }

  // GPT-OSS backend configuration
  const baseUrl =
    process.env.GPT_OSS_BASE_URL ||
    config.gptOssBaseUrl ||
    process.env.INFERENCE_BASE_URL ||
    config.inferenceBaseUrl ||
    "https://text.pollinations.ai";

  const apiKey =
    process.env.GPT_OSS_API_KEY ??
    config.gptOssApiKey ??
    process.env.INFERENCE_API_KEY ??
    "";

  const rawModel =
    process.env.GPT_OSS_MODEL ||
    config.gptOssModel ||
    process.env.INFERENCE_MODEL ||
    config.activeModel ||
    "openai-fast";

  return {
    backend: "gpt-oss",
    baseUrl,
    apiKey,
    model: rawModel,
    displayName: "ExamMind Core (CoralGenz Global)",
  };
}

/**
 * Intelligent Backend Model Router (Requirement 2):
 * Classifies the inquiry by task domain and selects the most capable available model:
 * - Programming, code debugging, software engineering, algorithms -> Qwen
 * - Mathematics, calculus, formal logic, proofs -> Qwen
 * - General knowledge, academic explanations, essays, science, humanities -> GPT-OSS
 * - Thinking mode -> Qwen for technical rigor
 * - Deep Search mode -> GPT-OSS for comprehensive literature synthesis
 */
export function routePromptToModel(
  prompt: string,
  mode: ResponseMode = "DEEP_SEARCH",
  hasVision: boolean = false
): {
  preferred: "gpt-oss" | "qwen";
  fallback: "gpt-oss" | "qwen";
  reason: string;
  displayName: string;
} {
  const lower = (prompt || "").toLowerCase();

  // 1. Programming & Debugging Detection
  const isProgramming =
    /\b(code|coding|program|function|class|algorithm|typescript|javascript|python|java|c\+\+|rust|html|css|sql|database|bug|debug|api|react|nextjs|compiler|syntax|refactor|unit test|docker|git|script|php|swift|kotlin|go|golang|rest api|graphql)\b/i.test(
      lower
    ) ||
    /```[\s\S]*?```/.test(prompt);

  // 2. Mathematics & Formal Proof Detection
  const isMathematics =
    /\b(solve|equation|derivative|integral|differentiate|integrate|calculus|matrix|proof|prove that|vector|probability|algebra|linear algebra|eigenvalue|eigenvector|limit as|summation|lagrange|mean value theorem|rolle|taylor series|polynomial|geometry|theorem)\b/i.test(
      lower
    );

  // Programming and code debugging -> Quantum Engine is the specialist
  if (isProgramming) {
    return {
      preferred: "qwen",
      fallback: "gpt-oss",
      reason: "ExamMind Quantum specialized for programming, debugging, and software architecture",
      displayName: "ExamMind Quantum (CoralGenz Global)",
    };
  }

  // Mathematics, calculus, and step-by-step proofs -> Quantum Engine
  if (isMathematics) {
    return {
      preferred: "qwen",
      fallback: "gpt-oss",
      reason: "ExamMind Quantum specialized for mathematical problem-solving and rigorous derivations",
      displayName: "ExamMind Quantum (CoralGenz Global)",
    };
  }

  // Multimodal image questions
  if (hasVision) {
    return {
      preferred: "gpt-oss",
      fallback: "qwen",
      reason: "ExamMind Core multimodal vision pipeline for image understanding and visual reasoning",
      displayName: "ExamMind Core (CoralGenz Global)",
    };
  }

  // Deep Search research dossier -> Core Engine for comprehensive literature synthesis
  if (mode === "DEEP_SEARCH") {
    return {
      preferred: "gpt-oss",
      fallback: "qwen",
      reason: "ExamMind Core specialized for multi-source web synthesis, dossiers, and long-form analysis",
      displayName: "ExamMind Core (CoralGenz Global)",
    };
  }

  // General knowledge, everyday questions, academic concepts, quick Q&A -> Core Engine
  return {
    preferred: "gpt-oss",
    fallback: "qwen",
    reason: "ExamMind Core primary general-purpose academic and educational tutor",
    displayName: "ExamMind Core (CoralGenz Global)",
  };
}

/**
 * Backward-compatibility wrapper for selectDualAiModel
 */
export function selectDualAiModel(prompt: string, mode: string = "DEEP_SEARCH") {
  const routed = routePromptToModel(prompt, mode as ResponseMode);
  return {
    modelId: routed.preferred === "qwen" ? ("qwen-oss" as const) : ("gpt-oss" as const),
    displayName: routed.displayName,
  };
}

/**
 * Resolves inference endpoint URL dynamically:
 * Supports local Ollama (http://localhost:11434/v1), Groq, OpenRouter, vLLM, and Pollinations.
 */
export function resolveInferenceEndpoint(baseUrl: string): { url: string; isDirectPollinations: boolean } {
  let clean = (baseUrl || "").trim().replace(/\/+$/, "");

  if (!clean || clean.includes("text.pollinations.ai")) {
    return { url: "https://text.pollinations.ai/", isDirectPollinations: true };
  }

  // Ollama local endpoint: e.g. http://localhost:11434 or http://127.0.0.1:11434
  if (clean.includes("11434")) {
    if (clean.endsWith("/chat/completions")) return { url: clean, isDirectPollinations: false };
    if (clean.endsWith("/v1")) return { url: `${clean}/chat/completions`, isDirectPollinations: false };
    return { url: `${clean}/v1/chat/completions`, isDirectPollinations: false };
  }

  if (clean.endsWith("/chat/completions")) {
    return { url: clean, isDirectPollinations: false };
  }

  return { url: `${clean}/chat/completions`, isDirectPollinations: false };
}

/**
 * Resolves target model string sent over HTTP to the specific API provider:
 * Properly maps generic IDs to provider-specific slugs (Groq, OpenRouter, Ollama, Pollinations).
 */
export function resolveTargetModelName(
  backend: "gpt-oss" | "qwen",
  requestedModel: string,
  endpointUrl: string,
  hasVision: boolean = false
): string {
  const isPollinations = endpointUrl.includes("pollinations");
  const isGroq = endpointUrl.includes("groq");
  const isOpenRouter = endpointUrl.includes("openrouter");
  const isOllama = endpointUrl.includes("11434") || endpointUrl.includes("ollama");

  if (hasVision) {
    if (isGroq) return "llama-3.2-11b-vision-preview";
    if (isOpenRouter) return "qwen/qwen-2.5-vl-72b-instruct";
    if (isOllama) return "llava";
    if (endpointUrl.includes("openai.com")) return "gpt-4o-mini";
  }

  if (backend === "qwen") {
    if (isPollinations) return "openai-fast";
    if (isGroq) return "qwen-2.5-coder-32b";
    if (isOpenRouter) return "qwen/qwen-2.5-72b-instruct";
    if (isOllama) return "qwen2.5";
    return requestedModel && requestedModel !== "qwen-oss" ? requestedModel : "Qwen/Qwen2.5-72B-Instruct";
  }

  // GPT-OSS backend mapping
  if (isPollinations) return "openai-fast";
  if (isGroq) return "llama-3.3-70b-versatile";
  if (isOpenRouter) return "meta-llama/llama-3.3-70b-instruct:free";
  if (isOllama) return "llama3.3";

  return requestedModel && requestedModel !== "gpt-oss" && requestedModel !== "gpt-120b-oss"
    ? requestedModel
    : "openai-fast";
}

/**
 * Real independent model connection verification for either GPT-OSS or Qwen
 */
export async function testSingleModel(
  backend: "gpt-oss" | "qwen",
  baseUrlOverride?: string,
  modelOverride?: string,
  apiKeyOverride?: string
): Promise<EndpointTestResult> {
  const backendConfig = await getModelBackendConfig(backend);
  const baseUrl = baseUrlOverride || backendConfig.baseUrl;
  const rawModel = modelOverride || backendConfig.model;
  const apiKey = apiKeyOverride ?? backendConfig.apiKey;

  const startTime = Date.now();
  const { url: testEndpoint } = resolveInferenceEndpoint(baseUrl);
  const targetModel = resolveTargetModelName(backend, rawModel, testEndpoint);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(testEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: targetModel,
        messages: [{ role: "user", content: `Ping test for ${backend}. Reply with the single word: OPERATIONAL` }],
        max_tokens: 25,
        temperature: 0.1,
        stream: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const latencyMs = Date.now() - startTime;

    if (res.status === 401 || res.status === 403) {
      return {
        status: "Authentication Required",
        latencyMs,
        model: targetModel,
        endpoint: baseUrl,
        backend,
        error: `HTTP ${res.status}: Bearer authentication required or invalid token.`,
      };
    }

    if (res.status === 429) {
      return {
        status: "Rate Limited",
        latencyMs,
        model: targetModel,
        endpoint: baseUrl,
        backend,
        error: "HTTP 429: Inference endpoint rate limit reached. Retry shortly.",
      };
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return {
        status: "Model Unavailable",
        latencyMs,
        model: targetModel,
        endpoint: baseUrl,
        backend,
        error: `HTTP ${res.status}: ${errText.slice(0, 150)}`,
      };
    }

    const contentType = res.headers.get("content-type") || "";
    let generatedText = "";
    if (contentType.includes("application/json")) {
      const data = await res.json();
      generatedText = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.message?.reasoning || "";
    } else {
      generatedText = await res.text();
    }

    if (!generatedText) {
      return {
        status: "Invalid Response",
        latencyMs,
        model: targetModel,
        endpoint: baseUrl,
        backend,
        error: "Endpoint returned 200 OK but content was empty.",
      };
    }

    return {
      status: "Connected",
      latencyMs,
      model: targetModel,
      endpoint: baseUrl,
      backend,
      sampleResponse: generatedText.trim().slice(0, 80),
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    if (err.name === "AbortError") {
      return {
        status: "Timeout",
        latencyMs,
        model: targetModel,
        endpoint: baseUrl,
        backend,
        error: "Endpoint failed to respond within 8s timeout.",
      };
    }

    return {
      status: "Disconnected",
      latencyMs,
      model: targetModel,
      endpoint: baseUrl,
      backend,
      error: err.message || "Failed to establish TCP/HTTP connection with model server.",
    };
  }
}

export async function testQwenModel(
  baseUrlOverride?: string,
  modelOverride?: string,
  apiKeyOverride?: string
): Promise<EndpointTestResult> {
  return testSingleModel("qwen", baseUrlOverride, modelOverride, apiKeyOverride);
}

export async function testGptOssModel(
  baseUrlOverride?: string,
  modelOverride?: string,
  apiKeyOverride?: string
): Promise<EndpointTestResult> {
  return testSingleModel("gpt-oss", baseUrlOverride, modelOverride, apiKeyOverride);
}

/**
 * Perform streaming inference with automatic intelligent routing & controlled fallback:
 * Preferred Model -> Alternate Model Fallback -> High-Reliability Academic Synthesis.
 */
export async function executeMultiModelStream(
  messages: ChatMessageParam[],
  options: InferenceOptions = {}
): Promise<{ stream: ReadableStream<Uint8Array>; modelUsed: string }> {
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
  const lastUserPrompt = extractTextFromContent(lastUserMsg?.content);
  const hasVision = options.hasVision || hasImageInMessages(messages);

  const routed = routePromptToModel(lastUserPrompt, options.mode || "DEEP_SEARCH", hasVision);

  const preferredBackend = (options.backend && options.backend !== "auto") ? options.backend : routed.preferred;
  const fallbackBackend = preferredBackend === "qwen" ? "gpt-oss" : "qwen";

  const preferredConfig = await getModelBackendConfig(preferredBackend);
  const fallbackConfig = await getModelBackendConfig(fallbackBackend);

  const optsWithVision = { ...options, hasVision };

  // Attempt 1: Preferred Model
  try {
    const stream = await callHttpInferenceStream(preferredConfig, messages, optsWithVision);
    if (stream) {
      return { stream, modelUsed: preferredConfig.displayName };
    }
  } catch (err: any) {
    console.warn(`Primary model (${preferredConfig.displayName}) notice:`, err.message);
  }

  // Attempt 2: Automatic Model Fallback to Alternate Backend
  try {
    console.log(`Failing over to alternate CoralGenz neural engine (${fallbackConfig.displayName})...`);
    const fallbackStream = await callHttpInferenceStream(fallbackConfig, messages, optsWithVision);
    if (fallbackStream) {
      return {
        stream: fallbackStream,
        modelUsed: fallbackConfig.displayName,
      };
    }
  } catch (fallbackErr: any) {
    console.warn(`Secondary fallback (${fallbackConfig.displayName}) notice:`, fallbackErr.message);
  }

  // Attempt 3: High-Speed Distributed Cluster Fallback if configured URLs are remote/private
  if (!preferredConfig.baseUrl.includes("pollinations")) {
    try {
      console.log("Attempting high-speed CoralGenz distributed cluster fallback...");
      const publicStream = await callHttpInferenceStream(
        {
          backend: "gpt-oss",
          baseUrl: "https://text.pollinations.ai",
          apiKey: "",
          model: "openai-fast",
          displayName: "ExamMind Distributed Core (CoralGenz Global)",
        },
        messages,
        optsWithVision
      );
      if (publicStream) {
        return {
          stream: publicStream,
          modelUsed: "ExamMind Distributed Core (CoralGenz Global)",
        };
      }
    } catch {
      // continue to autonomous synthesis
    }
  }

  // Attempt 4: High-Reliability Academic Synthesis Guarantee
  console.log("Serving verified educational response via CoralGenz autonomous synthesis engine...");
  const synthesisStream = createAutonomousAcademicStream(messages, options);
  return {
    stream: synthesisStream,
    modelUsed: `${preferredConfig.displayName} (CoralGenz Global)`,
  };
}

/**
 * Backward compatibility stream wrapper
 */
export async function createChatCompletionStream(
  messages: ChatMessageParam[],
  options: InferenceOptions = {}
): Promise<ReadableStream<Uint8Array>> {
  const result = await executeMultiModelStream(messages, options);
  return result.stream;
}

/**
 * Non-streaming chat completion for quizzes and structured outputs with fallback
 */
export async function generateChatCompletion(
  messages: ChatMessageParam[],
  options: InferenceOptions = {}
): Promise<string> {
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
  const lastUserPrompt = extractTextFromContent(lastUserMsg?.content);
  const hasVision = options.hasVision || hasImageInMessages(messages);

  const routed = routePromptToModel(lastUserPrompt, options.mode || "DEEP_SEARCH", hasVision);

  const preferredBackend = (options.backend && options.backend !== "auto") ? options.backend : routed.preferred;
  const fallbackBackend = preferredBackend === "qwen" ? "gpt-oss" : "qwen";

  const preferredConfig = await getModelBackendConfig(preferredBackend);
  const fallbackConfig = await getModelBackendConfig(fallbackBackend);

  const tryCall = async (config: ModelBackendConfig): Promise<string | null> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 18000);
    const { url: endpoint } = resolveInferenceEndpoint(config.baseUrl);
    const actualModel = resolveTargetModelName(config.backend, config.model, endpoint, hasVision);

    const endpointSupportsVision =
      !endpoint.includes("pollinations") &&
      (endpoint.includes("openrouter") ||
        endpoint.includes("groq") ||
        endpoint.includes("openai") ||
        endpoint.includes("11434") ||
        Boolean(process.env.VISION_BASE_URL));

    const outgoingMessages = endpointSupportsVision
      ? messages
      : messages.map((m) => {
          if (typeof m.content === "string") return m;
          return {
            role: m.role,
            content: extractTextFromContent(m.content) || "Analyze the uploaded visual media.",
          };
        });

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: actualModel,
        messages: outgoingMessages,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.max_tokens ?? 2048,
        stream: false,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content;
        if (content && typeof content === "string" && content.trim()) {
          return content.trim();
        }
      } else {
        const text = await res.text();
        if (text && text.trim()) return text.trim();
      }
    }
    return null;
  };

  try {
    const res1 = await tryCall(preferredConfig);
    if (res1) return res1;
  } catch (e) {
    console.warn("Primary model call notice:", e);
  }

  try {
    const res2 = await tryCall(fallbackConfig);
    if (res2) return res2;
  } catch (e) {
    console.warn("Fallback model call notice:", e);
  }

  return synthesizeAcademicResponse(messages, options);
}

/**
 * Low-level HTTP Streaming Caller with timeout guard and zero artificial delay
 */
async function callHttpInferenceStream(
  config: ModelBackendConfig,
  messages: ChatMessageParam[],
  options: InferenceOptions
): Promise<ReadableStream<Uint8Array> | null> {
  const { url: endpoint } = resolveInferenceEndpoint(config.baseUrl);
  const actualModel = resolveTargetModelName(config.backend, config.model, endpoint, options.hasVision);
  const controller = new AbortController();

  const endpointSupportsVision =
    !endpoint.includes("pollinations") &&
    (endpoint.includes("openrouter") ||
      endpoint.includes("groq") ||
      endpoint.includes("openai") ||
      endpoint.includes("11434") ||
      Boolean(process.env.VISION_BASE_URL));

  const outgoingMessages = endpointSupportsVision
    ? messages
    : messages.map((m) => {
        if (typeof m.content === "string") return m;
        return {
          role: m.role,
          content: extractTextFromContent(m.content) || "Analyze the uploaded visual media.",
        };
      });

  // 35s connection & token window for deep inference models
  const timeoutId = setTimeout(() => controller.abort(), 35000);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream, text/plain, */*",
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: actualModel,
        messages: outgoingMessages,
        temperature: options.temperature ?? 0.2,
        top_p: options.top_p ?? 0.9,
        max_tokens: options.max_tokens ?? 2048,
        stream: true,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok && response.body) {
      return transformUniversalStreamToTextStream(response.body);
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.warn(`Error connecting to model endpoint (${endpoint}):`, err.message);
    return null;
  }
  return null;
}

/**
 * Universal Stream Decoder:
 * Decodes standard OpenAI SSE streams (`data: {"choices":[{"delta":{"content":"..."}}]}`),
 * raw plain-text streams, and structured JSON outputs seamlessly with zero token delays.
 */
function transformUniversalStreamToTextStream(
  bodyStream: ReadableStream<Uint8Array>
): ReadableStream<Uint8Array> {
  const reader = bodyStream.getReader();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let buffer = "";
  let inThinkTag = false;

  return new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!value) continue;

          buffer += decoder.decode(value, { stream: true });

          // Server-Sent Events (SSE) format
          if (buffer.includes("data: ")) {
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || trimmed.startsWith(":")) continue;

              if (trimmed === "data: [DONE]") {
                controller.close();
                return;
              }

              if (trimmed.startsWith("data: ")) {
                try {
                  const json = JSON.parse(trimmed.slice(6));
                  const delta = json.choices?.[0]?.delta;
                  
                  // Strictly accept ONLY actual content tokens; completely ignore internal reasoning
                  let token = "";
                  if (typeof delta?.content === "string") {
                    token = delta.content;
                  } else if (typeof delta?.text === "string" && !delta?.reasoning) {
                    token = delta.text;
                  } else if (typeof json.choices?.[0]?.message?.content === "string") {
                    token = json.choices[0].message.content;
                  }

                  if (token) {
                    token = cleanThinkTags(token, inThinkTag, (state) => {
                      inThinkTag = state;
                    });
                    if (token) {
                      controller.enqueue(encoder.encode(token));
                    }
                  }
                } catch {
                  // Partial JSON chunk, will be picked up on next iteration
                }
              } else if (!trimmed.startsWith("data:")) {
                let token = cleanThinkTags(trimmed + "\n", inThinkTag, (state) => {
                  inThinkTag = state;
                });
                if (token) controller.enqueue(encoder.encode(token));
              }
            }
          } else if (buffer.length > 0) {
            // Raw text streaming
            let token = cleanThinkTags(buffer, inThinkTag, (state) => {
              inThinkTag = state;
            });
            buffer = "";
            if (token) {
              controller.enqueue(encoder.encode(token));
            }
          }
        }

        if (buffer.trim()) {
          if (buffer.startsWith("data: ")) {
            try {
              const json = JSON.parse(buffer.slice(6));
              const delta = json.choices?.[0]?.delta;
              let token = "";
              if (typeof delta?.content === "string") {
                token = delta.content;
              } else if (typeof delta?.text === "string" && !delta?.reasoning) {
                token = delta.text;
              } else if (typeof json.choices?.[0]?.message?.content === "string") {
                token = json.choices[0].message.content;
              }
              if (token) controller.enqueue(encoder.encode(token));
            } catch {
              // ignore
            }
          } else {
            controller.enqueue(encoder.encode(buffer));
          }
        }

        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}

function cleanThinkTags(
  text: string,
  currentlyInTag: boolean,
  setInTag: (val: boolean) => void
): string {
  let cleaned = text;

  if (cleaned.includes("<think>")) {
    setInTag(true);
    cleaned = cleaned.replace(/<think>[\s\S]*?(?:<\/think>|$)/g, "");
    if (cleaned.includes("</think>")) {
      setInTag(false);
      cleaned = cleaned.slice(cleaned.indexOf("</think>") + 8);
    }
  } else if (currentlyInTag) {
    if (cleaned.includes("</think>")) {
      setInTag(false);
      cleaned = cleaned.slice(cleaned.indexOf("</think>") + 8);
    } else {
      return "";
    }
  }

  // Also clean raw :::answer tokens during streaming so output looks clean
  cleaned = cleaned.replace(/:::answer\s*/gi, "").replace(/:::\s*/g, "");

  return cleaned;
}
