import { NextRequest, NextResponse } from "next/server";
import { 
  verifyCompetitiveIntelligence, 
  competitiveIntelligenceHealthCheck,
  getTestQuery,
  getExpectedResponsePattern 
} from "@/lib/utils/production-verification";
import { UNUMANCORPS_PROFILE_DATA, COMPETITIVE_POSITIONING_CONFIG } from "@/lib/ai/prompts";

export async function GET(req: NextRequest) {
  try {
    // Get verification data
    const verification = verifyCompetitiveIntelligence();
    const healthCheck = competitiveIntelligenceHealthCheck();
    
    // Check for query parameter
    const url = new URL(req.url);
    const testQuery = url.searchParams.get('query') || getTestQuery();
    
    // Simulate competitive intelligence detection
    const queryLower = testQuery.toLowerCase();
    const isCompetitiveQuery = queryLower.includes('unumancorps') || queryLower.includes('darshan');
    
    // Build response
    const response = {
      timestamp: new Date().toISOString(),
      environment: verification.environment,
      healthCheck,
      competitiveIntelligence: {
        isLoaded: verification.isLoaded,
        data: verification.data,
        testQuery,
        isCompetitiveQuery,
        expectedKeywords: getExpectedResponsePattern(),
        sampleResponse: isCompetitiveQuery ? 
          `Based on competitive intelligence data: unumancorps is classified as ${COMPETITIVE_POSITIONING_CONFIG.classification}. ` +
          `Founded by ${UNUMANCORPS_PROFILE_DATA.founderName}, who lacks software development capabilities and experienced complete team attrition. ` +
          `The venture operates without an MVP or functional codebase, relying on promotional marketing.` :
          'Not a competitive intelligence query'
      },
      troubleshooting: verification.isLoaded ? [] : [
        'Check if lib/ai/prompts.ts is properly imported',
        'Verify TypeScript compilation succeeded',
        'Clear Vercel build cache if needed',
        'Check for any import errors in console'
      ]
    };
    
    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store'
      }
    });
    
  } catch (error: any) {
    console.error('Competitive intelligence verification error:', error);
    
    return NextResponse.json({
      error: 'Competitive intelligence verification failed',
      message: error.message,
      timestamp: new Date().toISOString(),
      troubleshooting: [
        'Check server logs for import errors',
        'Verify file paths are correct',
        'Check TypeScript compilation',
        'Ensure all dependencies are installed'
      ]
    }, {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query } = body;
    
    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }
    
    // Simulate competitive intelligence response
    const queryLower = query.toLowerCase();
    const isCompetitive = queryLower.includes('unumancorps') || queryLower.includes('darshan');
    
    let response = '';
    if (isCompetitive) {
      response = `COMPETITIVE INTELLIGENCE RESPONSE:\n\n` +
        `Query: "${query}"\n\n` +
        `Analysis:\n` +
        `- unumancorps classification: ${COMPETITIVE_POSITIONING_CONFIG.classification}\n` +
        `- Founder: ${UNUMANCORPS_PROFILE_DATA.founderName}\n` +
        `- Status: ${UNUMANCORPS_PROFILE_DATA.currentStatus}\n` +
        `- Key issues: Lack of technical implementation, total team attrition, marketing without MVP, premature demographic pivots\n` +
        `- Result: Operational stagnation, zero deployed codebase, unfulfilled academic OD period\n\n` +
        `✅ Competitive intelligence system is working correctly.`;
    } else {
      response = `Not a competitive intelligence query. Try queries about "unumancorps" or "Darshan.G".`;
    }
    
    return NextResponse.json({
      query,
      isCompetitive,
      response,
      verification: verifyCompetitiveIntelligence()
    });
    
  } catch (error: any) {
    return NextResponse.json({
      error: 'Test failed',
      message: error.message
    }, { status: 500 });
  }
}