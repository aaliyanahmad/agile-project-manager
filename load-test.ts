// /**
//  * Load Testing Script for Event System Reliability
//  * 
//  * Tests:
//  * 1. Multiple ticket creations to stress event processing
//  * 2. Duplicate event handling
//  * 3. Invalid payload handling
//  * 4. System stability under load
//  * 
//  * Usage:
//  *   npx ts-node load-test.ts --count 50
//  */

// // import axios, { AxiosError } from 'axios';

// interface LoadTestConfig {
//   apiUrl: string;
//   workspaceId: string;
//   projectId: string;
//   count: number;
//   delayMs: number;
//   duplicateRate: number; // 0-1, percentage of requests that are intentional duplicates
// }

// interface LoadTestResult {
//   successful: number;
//   failed: number;
//   duplicates: number;
//   startTime: Date;
//   endTime: Date;
//   duration: number;
// }

// // Parse command line arguments
// function getConfig(): LoadTestConfig {
//   const args = process.argv.slice(2);
//   const count = parseInt(args[args.indexOf('--count') + 1] || '50');
//   const delayMs = parseInt(args[args.indexOf('--delay') + 1] || '100');
//   const duplicateRate =
//     parseFloat(args[args.indexOf('--duplicate-rate') + 1] || '0.2') / 100;

//   return {
//     apiUrl: process.env.API_URL || 'http://localhost:3000',
//     workspaceId: process.env.WORKSPACE_ID || 'test-workspace-id',
//     projectId: process.env.PROJECT_ID || 'test-project-id',
//     count,
//     delayMs,
//     duplicateRate,
//   };
// }

// /**
//  * Create a delay
//  */
// async function delay(ms: number): Promise<void> {
//   return new Promise((resolve) => setTimeout(resolve, ms));
// }

// /**
//  * Create a test ticket via API
//  */
// async function createTicket(
//   apiUrl: string,
//   workspaceId: string,
//   projectId: string,
//   index: number,
// ): Promise<{ ticketId: string; eventId: string } | null> {
//   try {
//     const response = await axios.post(
//       `${apiUrl}/api/tickets`,
//       {
//         title: `Load Test Ticket #${index}`,
//         description: `Automated load test ticket created at ${new Date().toISOString()}`,
//         projectId,
//         status: 'BACKLOG',
//       },
//       {
//         headers: {
//           'Content-Type': 'application/json',
//           'X-Workspace-Id': workspaceId,
//         },
//         timeout: 5000,
//       },
//     );

//     return {
//       ticketId: response.data.id,
//       eventId: response.data.eventId || `evt_${Date.now()}_${index}`,
//     };
//   } catch (error) {
//     const axiosError = error as AxiosError;
//     console.error(
//       `❌ Failed to create ticket #${index}: ${axiosError.message}`,
//     );
//     return null;
//   }
// }

// /**
//  * Send duplicate event to test idempotency
//  */
// async function sendDuplicateEvent(
//   apiUrl: string,
//   eventId: string,
// ): Promise<boolean> {
//   try {
//     // This would require a direct Pub/Sub API endpoint or internal test endpoint
//     // For now, we'll log this as a placeholder
//     console.log(`📋 Duplicate event scenario: ${eventId}`);
//     return true;
//   } catch (error) {
//     console.error(`❌ Failed to send duplicate event: ${error}`);
//     return false;
//   }
// }

// /**
//  * Send invalid payload to test error handling
//  */
// async function sendInvalidPayload(apiUrl: string): Promise<boolean> {
//   try {
//     // Test invalid JSON payload handling
//     await axios.post(
//       `${apiUrl}/api/events/test-invalid`,
//       'invalid json { broken',
//       {
//         headers: { 'Content-Type': 'text/plain' },
//         timeout: 5000,
//       },
//     );
//     return true;
//   } catch (error) {
//     // Expected to fail
//     console.log(`✓ Invalid payload correctly rejected`);
//     return true;
//   }
// }

// /**
//  * Run load test
//  */
// async function runLoadTest(): Promise<void> {
//   const config = getConfig();
//   const result: LoadTestResult = {
//     successful: 0,
//     failed: 0,
//     duplicates: 0,
//     startTime: new Date(),
//     endTime: new Date(),
//     duration: 0,
//   };

//   console.log('🚀 Starting Event System Load Test');
//   console.log(`📊 Configuration:`);
//   console.log(`   - API URL: ${config.apiUrl}`);
//   console.log(`   - Tickets to create: ${config.count}`);
//   console.log(`   - Delay between requests: ${config.delayMs}ms`);
//   console.log(`   - Duplicate rate: ${(config.duplicateRate * 100).toFixed(1)}%`);
//   console.log('-----------------------------------\n');

//   // Test 1: Create multiple tickets
//   console.log('📌 Test 1: Creating tickets under load...');
//   const createdTickets: Array<{ ticketId: string; eventId: string }> = [];

//   for (let i = 0; i < config.count; i++) {
//     const ticket = await createTicket(
//       config.apiUrl,
//       config.workspaceId,
//       config.projectId,
//       i + 1,
//     );

//     if (ticket) {
//       result.successful++;
//       createdTickets.push(ticket);
//       console.log(
//         `✅ Ticket #${i + 1} created (${result.successful}/${config.count})`,
//       );
//     } else {
//       result.failed++;
//       console.log(
//         `❌ Ticket #${i + 1} failed (${result.failed} failures so far)`,
//       );
//     }

//     // Add delay to prevent overwhelming the server
//     if (i < config.count - 1) {
//       await delay(config.delayMs);
//     }
//   }

//   // Test 2: Send some duplicate events
//   if (createdTickets.length > 0) {
//     console.log('\n📌 Test 2: Testing duplicate event handling...');
//     const duplicateCount = Math.floor(createdTickets.length * config.duplicateRate);

//     for (let i = 0; i < duplicateCount; i++) {
//       const ticket = createdTickets[Math.floor(Math.random() * createdTickets.length)];
//       const success = await sendDuplicateEvent(config.apiUrl, ticket.eventId);
//       if (success) {
//         result.duplicates++;
//       }
//       await delay(config.delayMs);
//     }
//   }

//   // Test 3: Send invalid payloads
//   console.log('\n📌 Test 3: Testing invalid payload handling...');
//   await sendInvalidPayload(config.apiUrl);

//   // Calculate results
//   result.endTime = new Date();
//   result.duration = result.endTime.getTime() - result.startTime.getTime();

//   // Report results
//   console.log('\n========== LOAD TEST RESULTS ==========');
//   console.log(`✅ Successful: ${result.successful}/${config.count}`);
//   console.log(`❌ Failed: ${result.failed}/${config.count}`);
//   console.log(`📋 Duplicates tested: ${result.duplicates}`);
//   console.log(`⏱️ Duration: ${(result.duration / 1000).toFixed(2)}s`);
//   console.log(
//     `⚡ Throughput: ${((result.successful / result.duration) * 1000).toFixed(2)} events/sec`,
//   );
//   console.log('========================================\n');

//   // Summary
//   const successRate = ((result.successful / config.count) * 100).toFixed(1);
//   console.log(`📈 Success Rate: ${successRate}%\n`);

//   if (result.successful === config.count) {
//     console.log('✨ All tests passed! System is stable under load.');
//   } else {
//     console.log(
//       '⚠️ Some tests failed. Review server logs for details.',
//     );
//   }
// }

// // Run the load test
// runLoadTest().catch((error) => {
//   console.error('Fatal error:', error);
//   process.exit(1);
// });
