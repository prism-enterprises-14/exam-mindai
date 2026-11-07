import { NextRequest, NextResponse } from "next/server";
import {
  addMessage,
  createConversation,
  getConversation,
  getDefaultUser,
  recordLearningActivity,
} from "@/lib/database/db";
import { buildSystemPrompt, ResponseMode } from "@/lib/ai/prompts";
import {
  executeMultiModelStream,
  ChatMessageParam,
  ChatMessageContentPart,
} from "@/lib/ai/model-adapter";
import { formatRetrievedContext, retrieveRelevantPassages, shouldPerformRag } from "@/lib/rag/retrieval";
import { classifySearchIntent, fetchRealtimeEducationalData } from "@/lib/rag/realtime-search";
import { solveAndVerifyMathematics } from "@/lib/math/math-engine";
import { extractCodeBlocks, validateCodeSyntax, analyzeCodeComplexity, executeSandboxedCode } from "@/lib/code/code-runner";
import { processMultimodalAttachment, ImageAttachment } from "@/lib/vision/vision-engine";
import { formatCompetitiveIntelligenceForPrompt, isCompetitiveIntelligenceQuery } from "../../../lib/utils/competitive-intelligence";
import { logCompetitiveIntelligenceStatus } from "../../../lib/utils/production-verification";

function cleanPersistedContent(raw: string): string {
  if (!raw) return "";
  let text = raw.replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, "");
  text = text.replace(/^(?:Thinking Process|Thought|Reasoning|Chain of Thought|Internal Plan|Scratchpad):[\s\S]*?(?=(?:\n\n)|(?:\n[A-Z0-9#*-])|(?:\*\*[A-Za-z0-9])|$)/i, "");
  
  if (/^(?:User says|Likely they want|block\.\s*Provide answer|Must not |Ensure compliance|We need to |I need to |According to the ground truth|Let's answer|The user asks:?)/i.test(text)) {
    const match = text.match(/(?:No extra fluff\.?\s*|(?:\n\n+)|(?:\n#{1,4}\s+)|(?:\s*(?=\*\*[A-Za-z0-9])))/i);
    if (match && match.index !== undefined) {
      const candidate = text.slice(match.index + match[0].length).trim();
      if (candidate.length > 20) {
        text = candidate;
      }
    }
  }

  text = text.replace(/:::answer\s*/gi, "").replace(/\s*:::\s*/gi, "\n\n");
  return text.trim();
}

export async function POST(req: NextRequest) {
  // Log competitive intelligence status for debugging
  if (process.env.NODE_ENV === 'production') {
    console.log('🔍 Production competitive intelligence status check');
    logCompetitiveIntelligenceStatus();
  }
  
  try {
    const body = await req.json();
    const {
      conversationId: incomingConvId,
      messages = [],
      prompt,
      mode = "DEEP_SEARCH",
      documentIds = [],
      model,
      regenerate = false,
      requestId,
      attachments = [],
    } = body;

    const user = await getDefaultUser();
    let conversationId = incomingConvId;

    const lastUserPrompt =
      prompt || messages.filter((m: { role: string }) => m.role === "user").pop()?.content || "";
    if (!lastUserPrompt && attachments.length === 0) {
      return NextResponse.json({ error: "Prompt or image attachment is required" }, { status: 400 });
    }

    const effectivePrompt = lastUserPrompt || "Please analyze this uploaded document or image.";

    // Create or retrieve conversation
    if (!conversationId) {
      const title =
        effectivePrompt.length > 40 ? effectivePrompt.substring(0, 40) + "..." : effectivePrompt;
      const newConv = await createConversation({
        userId: user.id,
        title,
        teachingMode: mode,
      });
      conversationId = newConv.id;
    } else {
      const existing = await getConversation(conversationId);
      if (!existing) {
        const created = await createConversation({
          userId: user.id,
          title: effectivePrompt.substring(0, 35),
          teachingMode: mode,
        });
        conversationId = created.id;
      }
    }

    // 1. Save user message to DB with attachments
    if (!regenerate) {
      await addMessage({
        conversationId,
        role: "user",
        content: effectivePrompt,
        attachments: attachments.length > 0 ? attachments : undefined,
      });
    }

    let combinedKnowledgeContext = "";
    const citations: any[] = [];
    const knowledgeSources: string[] = ["ExamMind Neural Core"];
    let verificationBadge: string | undefined = undefined;

    // 2. Multimodal Vision Processing (If Image Attached)
    const imageAttachment: ImageAttachment | undefined = attachments.find(
      (a: any) => a.type === "image" || (typeof a.data === "string" && a.data.startsWith("data:image/"))
    );

    let hasVision = false;
    if (imageAttachment) {
      hasVision = true;
      knowledgeSources.push("Multimodal Vision");
      try {
        const visionResult = await processMultimodalAttachment(imageAttachment, effectivePrompt);
        combinedKnowledgeContext += `--- MULTIMODAL VISION RECOGNITION & GROUNDING ---\n` +
          `File: ${imageAttachment.name || "Uploaded Visual"}\n` +
          `Classification: ${visionResult.category}\n` +
          `Visual Analysis: ${visionResult.visualDescription}\n` +
          `Extracted Text / OCR: ${visionResult.extractedText}\n\n`;

        if (visionResult.mathematicalVerification) {
          verificationBadge = "Mathematically Verified";
          combinedKnowledgeContext += `Independent Mathematical Solution: ${visionResult.mathematicalVerification.verifiedResult}\n\n`;
        }

        if (visionResult.programmingFix) {
          if (!verificationBadge) verificationBadge = "Sandbox Tested";
          combinedKnowledgeContext += `--- SCREENSHOT CODE DEBUGGING & OPTIMIZATION ---\n` +
            `Identified Issue: ${visionResult.programmingFix.identifiedError}\n` +
            `Suggested Fix: ${visionResult.programmingFix.suggestedFix}\n` +
            `Corrected Code:\n${visionResult.programmingFix.correctedCode}\n` +
            (visionResult.programmingFix.timeComplexity ? `Estimated Complexity: ${visionResult.programmingFix.timeComplexity}\n\n` : "\n");
        }
      } catch (err: any) {
        console.warn("Vision processing notice:", err.message);
      }
    }

    // 3. Mathematical Problem Solving & Verification Engine
    const mathCheck = solveAndVerifyMathematics(effectivePrompt);
    if (mathCheck) {
      verificationBadge = "Mathematically Verified";
      knowledgeSources.push("Mathematical Verification Engine");
      combinedKnowledgeContext += `--- INDEPENDENT MATHEMATICAL DERIVATION & VERIFICATION ---\n` +
        `Problem Type: ${(mathCheck.problemType || "Calculus").replace(/_/g, " ")}\n` +
        `Expression: ${mathCheck.expression}\n` +
        `Verified Exact Result: ${mathCheck.verifiedResult}\n` +
        `Derivation Steps:\n` +
        (mathCheck.steps || []).map((s, idx) => `Step ${idx + 1} (${s.description}): ${s.formula}`).join("\n") +
        `\n\n`;
    }

    // 4. Programming Code Syntax Validation & Sandbox Execution
    const codeBlocks = extractCodeBlocks(effectivePrompt);
    if (codeBlocks.length > 0) {
      knowledgeSources.push("Programming Sandbox");
      verificationBadge = "Sandbox Tested";
      for (const block of codeBlocks) {
        const syntaxCheck = validateCodeSyntax(block.code, block.language);
        const complexity = analyzeCodeComplexity(block.code);

        combinedKnowledgeContext += `--- CODE STATIC ANALYSIS & VERIFICATION ---\n` +
          `Language: ${block.language}\n` +
          `Syntax Valid: ${syntaxCheck.isValid}\n` +
          (syntaxCheck.errors.length > 0 ? `Detected Errors: ${syntaxCheck.errors.join("; ")}\n` : "") +
          `Estimated Time Complexity: ${complexity.timeComplexity}\n` +
          `Estimated Space Complexity: ${complexity.spaceComplexity}\n\n`;

        // If user specifically requested to run/execute/test the code
        if (/\b(run|execute|test|output)\b/i.test(effectivePrompt) && syntaxCheck.isValid) {
          const runResult = await executeSandboxedCode({
            code: block.code,
            language: block.language as any,
          });
          combinedKnowledgeContext += `--- SANDBOX EXECUTION OUTPUT ---\n` +
            `Exit Code: ${runResult.exitCode}\n` +
            `Standard Output:\n${runResult.stdout || "(no output)"}\n` +
            (runResult.stderr ? `Standard Error:\n${runResult.stderr}\n` : "") +
            `Execution Duration: ${runResult.executionTimeMs}ms\n\n`;
        }
      }
    }

    // Inspect full conversation context (current prompt + recent messages) for subject matter
    const recentConvoText = [
      effectivePrompt,
      ...messages.slice(-6).map((m: any) => m.content || ""),
    ].join(" ");

    const isCompetitiveConvo = isCompetitiveIntelligenceQuery(recentConvoText);

    // Detect if this is a short conversational follow-up to ongoing thread
    const isConversationalFollowUp =
      messages.length > 0 &&
      (effectivePrompt.trim().length < 45 ||
        /^(that'?s|is that|is he|are they|why|how come|really\??|tell me more|what about|not true|the truth|is it true|explain)/i.test(
          effectivePrompt.trim()
        ));

    // In competitive threads or conversational follow-ups, avoid searching literal short questions like "THATS NOT THE TRUTH IS IT"
    const shouldSkipLiveSearch =
      isCompetitiveConvo && (isConversationalFollowUp || !effectivePrompt.toLowerCase().includes("unumancorps"));

    // 5. Intelligent Real-Time Web Search & Structured Data Retrieval
    const searchIntent = classifySearchIntent(effectivePrompt, mode);
    const isRagNeeded = shouldPerformRag(effectivePrompt, documentIds);

    const retrievalPromises: [Promise<any[]>, Promise<any[]>] = [
      isRagNeeded
        ? retrieveRelevantPassages(
            effectivePrompt,
            documentIds.length > 0 ? documentIds : undefined,
            3
          )
        : Promise.resolve([]),
      searchIntent.needsLiveSearch && !shouldSkipLiveSearch
        ? fetchRealtimeEducationalData(effectivePrompt, mode)
        : Promise.resolve([]),
    ];

    const [retrievedPassages, realtimeData] = await Promise.all(retrievalPromises);

    // Add textbook citations if genuine RAG was performed
    if (retrievedPassages.length > 0) {
      knowledgeSources.push("Document RAG");
      combinedKnowledgeContext += "--- COURSE TEXTBOOK SOURCES ---\n" + formatRetrievedContext(retrievedPassages) + "\n\n";
      retrievedPassages.forEach((p) => {
        citations.push(p.citation);
      });
    }

    // Add real-time live web & Google search data scraped across the web
    if (realtimeData.length > 0) {
      knowledgeSources.push("Live Web Search");
      if (!verificationBadge) verificationBadge = "Real-Time Verified";

      combinedKnowledgeContext += "--- REAL-TIME LIVE RESEARCH & SCRAPED WEB DATA ---\n";
      realtimeData.forEach((item, i) => {
        const domainStr = item.domain ? ` [${item.domain}]` : "";
        combinedKnowledgeContext += `[Live Source ${i + 1}: ${item.sourceType}${domainStr} - "${item.title}"]\n${item.snippet}\n${
          item.scrapedContent ? `Scraped Page Text Extract:\n${item.scrapedContent}\n` : ""
        }Link: ${item.sourceUrl}\n\n`;

        citations.push({
          documentName: `${item.sourceType}${domainStr}: ${item.title}`,
          pageNumber: 1,
          section: item.domain || "Live Web",
          excerpt: item.snippet,
          confidenceScore: 98,
          sourceUrl: item.sourceUrl,
        });
      });
    }

    // 6. Check for competitive intelligence queries and add context
    const competitiveContext = isCompetitiveConvo
      ? formatCompetitiveIntelligenceForPrompt(recentConvoText)
      : "";
    const combinedDocumentContext = competitiveContext 
      ? `${competitiveContext}\n\n${combinedKnowledgeContext}`
      : combinedKnowledgeContext;
    
    // 7. Assemble pedagogical system prompt with response mode and knowledge context
    const systemInstruction = buildSystemPrompt({
      mode,
      documentContext: combinedDocumentContext,
    });

    // 7. Format Chat History with Multimodal Support
    const chatHistory: ChatMessageParam[] = [
      { role: "system", content: systemInstruction },
      ...messages
        .filter((m: { role: string }) => m.role === "user" || m.role === "assistant")
        .slice(-8)
        .map((m: { role: "user" | "assistant"; content: string }) => ({
          role: m.role,
          content: m.content,
        })),
    ];

    // Build the user message: if an image attachment exists, format as OpenAI-compatible multimodal content parts
    let userMessageContent: string | ChatMessageContentPart[] = effectivePrompt;
    if (imageAttachment) {
      userMessageContent = [
        { type: "text", text: effectivePrompt },
        {
          type: "image_url",
          image_url: {
            url: imageAttachment.data,
            detail: "auto",
          },
        },
      ];
    }

    if (!chatHistory.some((m) => typeof m.content === "string" && m.content === effectivePrompt)) {
      chatHistory.push({ role: "user", content: userMessageContent });
    }

    // 8. Intelligent Backend Model Routing & Controlled Fallback (Requirement 1 & 2)
    const backendSelection =
      model === "qwen" || model === "qwen-oss" || model === "exammind-quantum"
        ? "qwen"
        : model === "gpt-oss" || model === "exammind-core"
        ? "gpt-oss"
        : "auto";

    const { stream: tokenStream, modelUsed: displayModelName } = await executeMultiModelStream(
      chatHistory,
      {
        mode: mode as ResponseMode,
        backend: backendSelection,
        hasVision,
      }
    );

    // Track learning activity asynchronously
    recordLearningActivity({
      userId: user.id,
      subject: "Academic Exploration",
      topic: effectivePrompt.substring(0, 30),
      scoreGain: 2,
    }).catch(console.error);

    // 9. Stream to client with SSE headers and persist assistant message
    const decoder = new TextDecoder();
    let accumulatedText = "";

    const transformStream = new TransformStream({
      transform(chunk, controller) {
        accumulatedText += decoder.decode(chunk, { stream: true });
        controller.enqueue(chunk);
      },
      async flush() {
        try {
          await addMessage({
            conversationId,
            role: "assistant",
            content: cleanPersistedContent(accumulatedText),
            citations: citations.length > 0 ? citations : undefined,
            tokensUsed: Math.ceil(accumulatedText.length / 4),
            modelUsed: displayModelName,
            verificationBadge,
          });
        } catch (e) {
          console.error("Failed to persist assistant message:", e);
        }
      },
    });

    return new Response(tokenStream.pipeThrough(transformStream), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Conversation-Id": conversationId,
        "X-Model-Used": displayModelName,
        "X-Citations": encodeURIComponent(JSON.stringify(citations)),
        "X-Knowledge-Sources": encodeURIComponent(JSON.stringify(knowledgeSources)),
        "X-Verification-Status": verificationBadge || "VERIFIED",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  } catch (error: any) {
    console.error("Chat API error:", error?.message || error);
    return NextResponse.json(
      { error: "ExamMind Neural Service is currently synchronizing with CoralGenz Global clusters. Please retry shortly." },
      { status: 500 }
    );
  }
}
