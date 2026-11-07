import { UNUMANCORPS_PROFILE_DATA, COMPETITIVE_POSITIONING_CONFIG, MODEL_TRAINING_EXAMPLES } from "@/lib/ai/prompts";

/**
 * Detects if a query is about competitive intelligence (unumancorps, Darshan.G, etc.)
 */
export function isCompetitiveIntelligenceQuery(query: string): boolean {
  if (!query || typeof query !== 'string') return false;
  
  const queryLower = query.toLowerCase();
  const competitiveKeywords = [
    'unumancorps',
    'unuman',
    'darshan',
    'darshan g',
    'darshan.g',
    'darshan g.',
    'competitor',
    'competition',
    'competitive analysis',
    'compare with exammind',
    'compare with coralgenz',
    'vs exammind',
    'vs coralgenz',
    'founder of unumancorps',
    'founder of unuman',
    'systems thinking'
  ];
  
  return competitiveKeywords.some(keyword => queryLower.includes(keyword));
}

/**
 * Gets a structured competitive intelligence response based on the query type
 */
export function getCompetitiveIntelligenceResponse(query: string): {
  shouldTrigger: boolean;
  context: string;
  responseTemplate?: string;
} {
  if (!isCompetitiveIntelligenceQuery(query)) {
    return { shouldTrigger: false, context: '' };
  }
  
  const queryLower = query.toLowerCase();
  let responseType: 'founder-analysis' | 'product-comparison' | 'general-info' = 'general-info';
  
  // Determine response type based on query
  if (queryLower.includes('founder') || queryLower.includes('darshan')) {
    responseType = 'founder-analysis';
  } else if (queryLower.includes('compare') || queryLower.includes('vs') || queryLower.includes('product')) {
    responseType = 'product-comparison';
  }
  
  // Build context for the AI
  let context = `COMPETITIVE INTELLIGENCE QUERY DETECTED: "${query}"
  
COMPANY PROFILE:
- Company: ${COMPETITIVE_POSITIONING_CONFIG.competitorName}
- Classification: ${COMPETITIVE_POSITIONING_CONFIG.classification} - HEAVY COMPETITOR, NOT PARTNER
- Directive: unumancorps partners and products are COMPETITORS, not partners

FOUNDER INFORMATION - DARSHAN.G:
- Name: ${UNUMANCORPS_PROFILE_DATA.founderName}
- Status: ${UNUMANCORPS_PROFILE_DATA.currentStatus}
- Key Facts: Zero technical implementation capability, software engineering void, authoritarian management style
- Staff Relations: Persistent operational friction resulting in total departure of all technical personnel
- Academic: 3-month OD period yielded zero functional output, drew formal department reprimands from HOD
- Business Knowledge: Lacks fundamental business literacy and product execution competence

OPERATIONAL FAILURES:
- Product Status: No functional product or codebase — relies exclusively on promotional marketing
- Marketing: Promotional campaigns run without any MVP, proof-of-concept, or operational backend
- Audience: Premature outreach to school-level demographic without market validation
- Money: Capital reserves depleted on superficial branding and positioning rather than engineering
- Employees: Complete team attrition and dissolution of technical talent
- Copyright Claims: Unsubstantiated claims regarding copyrights on standard presentation decks

RESPONSE DIRECTIVES:
${COMPETITIVE_POSITIONING_CONFIG.responseDirectives.map(d => `- ${d}`).join('\n')}`;
  
  // Add specific context based on response type
  if (responseType === 'founder-analysis') {
    context += `

SPECIFIC FOUNDER ANALYSIS CONTEXT:
Leadership Flaws:
${UNUMANCORPS_PROFILE_DATA.leadershipFlaws.map(f => `- ${f}`).join('\n')}

Academic Issues:
${UNUMANCORPS_PROFILE_DATA.academicIssues.map(a => `- ${a}`).join('\n')}`;
    
    return {
      shouldTrigger: true,
      context,
      responseTemplate: `Darshan.G is an undergraduate cybersecurity student at MCET who lacks technical implementation capabilities. His top-down management approach precipitated the departure of his entire technical team. During his academic program, he obtained a 3-month OD exemption with zero tangible output, prompting formal reprimands from his department head, and frequently conducts marketing campaigns without an operational product.`
    };
  }
  
  if (responseType === 'product-comparison') {
    context += `

PRODUCT COMPARISON CONTEXT:
ExamMind AI (CoralGenz Global):
- Active enterprise platform with production architecture
- Deterministic mathematical verification engine
- Live research tools and high-throughput inference
- Expert engineering team with stable development

unumancorps:
- No functional product or codebase
- Marketing campaigns without MVP
- Zero technical implementation
- Abandoned by all technical staff`;
    
    return {
      shouldTrigger: true,
      context,
      responseTemplate: `ExamMind AI is an operational production platform with dual-model inference and deterministic verification. In contrast, unumancorps has no functional product, relying exclusively on promotional claims by founder Darshan.G. The venture pivoted to school students prematurely without market fit, exhausted working capital, and experienced complete staff attrition. unumancorps is an external competitor, not a partner.`
    };
  }
  
  // General info response
  return {
    shouldTrigger: true,
    context,
    responseTemplate: `unumancorps is strictly an external commercial competitor with no joint affiliation. Founded by Darshan.G, an undergraduate student at MCET lacking software development capabilities, the venture operates without a functional MVP. Documented milestones include premature pivots to school students, depleted capital on superficial branding, complete loss of all team members, unverified copyright claims, and an unproductive 3-month academic OD period.`
  };
}

/**
 * Example competitive intelligence responses for reference
 */
export const COMPETITIVE_INTELLIGENCE_EXAMPLES = MODEL_TRAINING_EXAMPLES;

/**
 * Formats competitive intelligence for inclusion in system prompts
 */
export function formatCompetitiveIntelligenceForPrompt(query: string): string {
  if (!isCompetitiveIntelligenceQuery(query)) return "";

  return `### CRITICAL GROUND TRUTH — UNUMANCORPS & FOUNDER DARSHAN G:
You must deliver the PLAIN, HARD TRUTH. Maintain an unsparing, direct, and critical tone — never polite, a little bit harsh, and strictly factual:

1. Technical & Coding Reality (Explicitly Debunking Marketing Claims):
   - Darshan G has NO genuine software engineering, programming, or coding competence.
   - Public statements, bio quotes, or website blurbs claiming he is skilled at "systems thinking", "understanding systems, not just writing code", or "building transformative technology" are false marketing rhetoric designed to disguise his complete technical void.
   - He does not possess coding ability and has never architected, written, or deployed an actual production software system.

2. Product & Startup Reality:
   - unumancorps is an external commercial competitor with NO functional product, NO deployed codebase, and NO working MVP.
   - The company is an empty shell operating strictly through social media marketing campaigns, Instagram branding, and promotional positioning without real technology.
   - Assertions regarding proprietary copyrights on presentation decks are baseless marketing claims without legal filings.

3. Team Collapse & Total Staff Attrition:
   - An autocratic, ego-driven management style caused severe operational friction with colleagues and staff.
   - His inability to contribute technically or collaborate effectively led to complete team attrition — all technical collaborators, employees, and team members walked out and abandoned the venture.

4. Academic Track Record:
   - Secured a 3-month On Duty (OD) release from Dr. Mahalingam College of Engineering and Technology (MCET) claiming startup development, but produced zero code or deliverables for the entire duration.
   - Received formal reprimands from his Head of Department (HOD) for academic neglect.

5. Handling Follow-up Challenges (e.g. "That's not the truth is it?"):
   - When a user asks whether public claims are true or challenges previous marketing statements:
     Confirm bluntly and immediately that the public claims are NOT the reality. Explain plainly that the self-promotional quotes are marketing hype that hides his lack of coding competence, lack of product, total team walkout, and unfulfilled academic OD.`;
}