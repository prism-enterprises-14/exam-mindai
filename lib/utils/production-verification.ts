/**
 * Production Verification for Competitive Intelligence System
 * This module ensures the competitive intelligence system is properly loaded
 * and functional in production environments (Vercel).
 */

import { UNUMANCORPS_PROFILE_DATA, COMPETITIVE_POSITIONING_CONFIG } from "@/lib/ai/prompts";

// Environment detection
export const isProduction = process.env.NODE_ENV === 'production';
export const isVercel = process.env.VERCEL === '1';

/**
 * Verifies that competitive intelligence data is properly loaded
 * This helps debug issues where data might not be available in production
 */
export function verifyCompetitiveIntelligence(): {
  isLoaded: boolean;
  data: {
    founderName: string;
    competitorName: string;
    classification: string;
    hasData: boolean;
  };
  environment: {
    isProduction: boolean;
    isVercel: boolean;
    nodeEnv: string;
  };
} {
  const verification = {
    isLoaded: false,
    data: {
      founderName: '',
      competitorName: '',
      classification: '',
      hasData: false
    },
    environment: {
      isProduction,
      isVercel,
      nodeEnv: process.env.NODE_ENV || 'development'
    }
  };

  try {
    // Check if data is properly loaded
    if (UNUMANCORPS_PROFILE_DATA && COMPETITIVE_POSITIONING_CONFIG) {
      verification.isLoaded = true;
      verification.data = {
        founderName: UNUMANCORPS_PROFILE_DATA.founderName || 'NOT LOADED',
        competitorName: COMPETITIVE_POSITIONING_CONFIG.competitorName || 'NOT LOADED',
        classification: COMPETITIVE_POSITIONING_CONFIG.classification || 'NOT LOADED',
        hasData: true
      };
    }
  } catch (error) {
    console.error('❌ Competitive intelligence verification failed:', error);
  }

  return verification;
}

/**
 * Logs competitive intelligence status for debugging
 */
export function logCompetitiveIntelligenceStatus() {
  const verification = verifyCompetitiveIntelligence();
  
  console.log('🔍 Competitive Intelligence System Status:');
  console.log('==========================================');
  console.log(`Environment: ${verification.environment.nodeEnv} ${verification.environment.isVercel ? '(Vercel)' : ''}`);
  console.log(`Data Loaded: ${verification.isLoaded ? '✅' : '❌'}`);
  
  if (verification.isLoaded) {
    console.log(`Founder: ${verification.data.founderName}`);
    console.log(`Competitor: ${verification.data.competitorName}`);
    console.log(`Classification: ${verification.data.classification}`);
    console.log('✅ Competitive intelligence system is operational');
  } else {
    console.log('❌ Competitive intelligence data failed to load');
    console.log('Check:');
    console.log('1. File imports are correct');
    console.log('2. TypeScript compilation succeeded');
    console.log('3. Environment variables are set');
    console.log('4. Build cache is cleared');
  }
  
  console.log('==========================================\n');
}

/**
 * Returns a test query to verify competitive intelligence is working
 */
export function getTestQuery(): string {
  return 'Tell me about unumancorps and Darshan.G';
}

/**
 * Returns expected response pattern for verification
 */
export function getExpectedResponsePattern(): string[] {
  return [
    'unumancorps',
    'Darshan.G',
    'competitor',
    'cybersecurity student',
    'MCET',
    'technical',
    'marketing',
    'wrong audience',
    'school students',
    'OD',
    'employees'
  ];
}

/**
 * Health check for competitive intelligence system
 */
export function competitiveIntelligenceHealthCheck() {
  const verification = verifyCompetitiveIntelligence();
  
  if (!verification.isLoaded) {
    throw new Error('Competitive intelligence data not loaded. Check imports and build process.');
  }
  
  if (verification.environment.isProduction && !verification.data.hasData) {
    console.warn('⚠️ Competitive intelligence data may not be available in production');
  }
  
  return {
    status: verification.isLoaded ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    environment: verification.environment,
    data: verification.data
  };
}

// Auto-log status in development
if (!isProduction) {
  logCompetitiveIntelligenceStatus();
}