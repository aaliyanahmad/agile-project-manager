/**
 * Google Pub/Sub Configuration
 * Reads configuration from environment variables
 * Supports service account credentials from .env
 */

import * as dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

export interface PubSubConfigType {
  projectId: string;
  topicName: string;
  subscriptionName: string;
  useEmulator: boolean;
  credentials?: any;
}

/**
 * Parse service account credentials from environment
 * Looks for GOOGLE_APPLICATION_CREDENTIALS_JSON in .env
 */
function parseServiceAccountCredentials(): any {
  const credsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  
  if (credsJson) {
    try {
      // Try parsing as-is first (might already be valid if properly stored)
      try {
        return JSON.parse(credsJson);
      } catch (firstError) {
        // If direct parse fails, try replacing escaped newlines
        const unescapedCredsJson = credsJson.replace(/\\n/g, '\n');
        return JSON.parse(unescapedCredsJson);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON:', errorMessage);
      return undefined;
    }
  }
  return undefined;
}

export const pubSubConfig: PubSubConfigType = {
  projectId: process.env.GCP_PROJECT_ID || 'test-project',
  topicName: process.env.PUBSUB_TOPIC || 'ticket-events',
  subscriptionName: process.env.PUBSUB_SUBSCRIPTION || 'ticket-events-sub',
  useEmulator: !!process.env.PUBSUB_EMULATOR_HOST,
  credentials: parseServiceAccountCredentials(),
};

/**
 * Validate Pub/Sub configuration on startup
 */
export function validatePubSubConfig(): void {
  // If using emulator, no validation needed
  if (pubSubConfig.useEmulator) {
    return;
  }

  // Warn if no project ID
  if (!process.env.GCP_PROJECT_ID) {
    console.warn(
      'Warning: GCP_PROJECT_ID not set. Using default "test-project". ' +
      'For production, set GCP_PROJECT_ID environment variable.',
    );
  }

  // Log success if credentials found
  if (pubSubConfig.credentials) {
    console.log('✓ Service account credentials loaded from GOOGLE_APPLICATION_CREDENTIALS_JSON');
  }
}
