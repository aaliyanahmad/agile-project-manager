import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  OnApplicationShutdown,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { PubSub, Subscription } from '@google-cloud/pubsub';
import { AppEvent } from '../interfaces/app-event.interface';
import { pubSubConfig, validatePubSubConfig } from '../pubsub.config';
import { EventHandlerService } from '../handlers/event-handler.service';
import { ProcessedEvent } from '../entities/processed-event.entity';

// Constants for reliability
const DEFAULT_PROCESSING_TIMEOUT_MS = 30000; // 30 seconds
const MAX_RETRIES_BEFORE_ALERT = 5;

/**
 * EventSubscriberService
 * Responsible for:
 * - Connecting to Pub/Sub subscription
 * - Listening to incoming messages
 * - Ensuring idempotency via ProcessedEvent tracking
 * - Delegating to EventHandlerService for business logic
 * - Hardened for reliability: proper retry handling, timeout protection, validation
 */
@Injectable()
export class EventSubscriberService
  implements OnModuleInit, OnModuleDestroy, OnApplicationShutdown
{
  private readonly logger = new Logger(EventSubscriberService.name);
  private pubSubClient: PubSub | null = null;
  private subscription: Subscription | null = null;
  private tempCredentialsFile: string | null = null;
  private isShuttingDown = false;

  constructor(
    @InjectRepository(ProcessedEvent)
    private processedEventRepo: Repository<ProcessedEvent>,
    private eventHandlerService: EventHandlerService,
  ) {}

  /**
   * Initialize subscriber on module startup
   */
  async onModuleInit(): Promise<void> {
    try {
      validatePubSubConfig();
      await this.startListening();
    } catch (error) {
      this.logger.error(
        `Failed to initialize EventSubscriberService: ${error.message}`,
        error.stack,
      );
      // Don't throw - allow graceful degradation
    }
  }

  /**
   * Cleanup on module destroy
   */
  onModuleDestroy(): void {
    this.logger.log('Module destroy: initiating subscriber cleanup...');
    this.stopListening();
  }

  /**
   * Graceful shutdown on application termination
   * Implements OnApplicationShutdown for NestJS lifecycle
   */
  async onApplicationShutdown(): Promise<void> {
    this.logger.log('🛑 Application shutting down: gracefully closing Pub/Sub subscription...');
    this.isShuttingDown = true;

    // Give in-flight messages time to complete
    await new Promise((resolve) => setTimeout(resolve, 2000));

    this.stopListening();
    this.logger.log('✓ Pub/Sub subscription closed cleanly');
  }

  /**
   * Start listening to Pub/Sub subscription
   */
  private async startListening(): Promise<void> {
    try {
      this.logger.log('Starting Pub/Sub subscriber...');

      // Write credentials to temporary file if available
      if (pubSubConfig.credentials) {
        const fs = await import('fs');
        const os = await import('os');
        const path = await import('path');
        const { v4: uuidv4 } = await import('uuid');

        const tempDir = os.tmpdir();
        this.tempCredentialsFile = path.join(
          tempDir,
          `gcp-creds-subscriber-${uuidv4()}.json`,
        );

        fs.writeFileSync(
          this.tempCredentialsFile,
          JSON.stringify(pubSubConfig.credentials),
        );
        process.env.GOOGLE_APPLICATION_CREDENTIALS = this.tempCredentialsFile;

        this.logger.debug(
          `✓ Credentials file written to: ${this.tempCredentialsFile}`,
        );
      }

      // Initialize Pub/Sub client
      this.pubSubClient = new PubSub({
        projectId: pubSubConfig.projectId,
      });

      // Get subscription reference
      this.subscription = this.pubSubClient.subscription(
        pubSubConfig.subscriptionName,
      );

      this.logger.log(
        `✓ Connected to subscription: ${pubSubConfig.subscriptionName}`,
      );

      // Set up message listener
      this.subscription.on('message', (message) => {
        this.onMessage(message);
      });

      // Set up error listener
      this.subscription.on('error', (error) => {
        this.logger.error(`Subscription error: ${error.message}`, error.stack);
      });

      this.logger.log(
        '✓ EventSubscriberService fully initialized and listening for events',
      );
    } catch (error) {
      this.logger.error(
        `Failed to start listening: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Stop listening to Pub/Sub subscription
   */
  private stopListening(): void {
    if (this.subscription) {
      try {
        this.subscription.removeAllListeners();
        this.logger.log('✓ Subscriber stopped');
      } catch (error) {
        this.logger.warn(`Error stopping subscriber: ${error.message}`);
      }
    }

    // Clean up temporary credentials file
    if (this.tempCredentialsFile) {
      try {
        const fs = require('fs');
        if (fs.existsSync(this.tempCredentialsFile)) {
          fs.unlinkSync(this.tempCredentialsFile);
          this.logger.debug(
            `✓ Deleted temporary credentials file: ${this.tempCredentialsFile}`,
          );
        }
      } catch (error) {
        this.logger.warn(
          `Failed to delete temporary credentials file: ${error.message}`,
        );
      }
    }
  }

  /**
   * Handle incoming message from Pub/Sub
   * Ensures idempotency, validates payload, and delegates to event handler
   * 
   * Retry strategy:
   * - Invalid payload: ACK (prevent retry loop)
   * - Processing error: NACK (allow Pub/Sub retry)
   * - Success: ACK
   */
  private async onMessage(message: any): Promise<void> {
    if (this.isShuttingDown) {
      this.logger.warn('Received message during shutdown, deferring message');
      message.nack(); // Return to queue for processing after restart
      return;
    }

    let event: AppEvent | null = null;

    try {
      // STEP 1: Parse and validate payload
      event = this.parseAndValidateEvent(message);
      if (!event) {
        // Invalid payload - ACK to prevent retry loop
        this.logger.warn('Invalid event payload received, acknowledging to prevent loop');
        message.ack();
        return;
      }

      this.logger.log(
        `📨 Event received: type=${event.type}, eventId=${event.eventId}`,
      );

      // STEP 2: Check idempotency
      const processedRecord = await this.getProcessedEventRecord(event.eventId);
      if (processedRecord && processedRecord.isProcessed) {
        this.logger.warn(
          `⚠️ Duplicate event skipped: ${event.eventId}`,
        );
        message.ack(); // Acknowledge to avoid reprocessing
        return;
      }

      // STEP 3: Track retry attempt
      if (processedRecord) {
        processedRecord.retryCount++;
        this.logger.debug(
          `Retry attempt #${processedRecord.retryCount} for event ${event.eventId}`,
        );
      }

      // STEP 4: Process with timeout protection
      await this.processEventWithTimeout(event, processedRecord);

      // STEP 5: Mark event as successfully processed
      await this.markEventAsProcessed(event);

      // STEP 6: Acknowledge the message
      message.ack();
      this.logger.log(
        `✅ Event processed successfully: ${event.eventId}`,
      );
    } catch (error) {
      // Extract retry info if available
      const eventId = event?.eventId || 'unknown';
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(
        `❌ Event processing failed: ${eventId} - ${errorMessage}`,
        error instanceof Error ? error.stack : '',
      );

      // DO NOT acknowledge on error - allow Pub/Sub to retry
      // This ensures fault tolerance and reliability
      this.logger.debug(
        `Message NOT acknowledged - will be retried by Pub/Sub: ${eventId}`,
      );
    }
  }

  /**
   * Parse and validate event payload
   * Returns null if invalid (to trigger ACK and prevent retry loop)
   */
  private parseAndValidateEvent(message: any): AppEvent | null {
    try {
      // Check message has data
      if (!message || !message.data) {
        this.logger.warn('Message has no data');
        return null;
      }

      // Parse JSON payload
      let event: any;
      try {
        event = JSON.parse(message.data.toString());
      } catch (error) {
        this.logger.warn(
          `Invalid JSON payload: ${error instanceof Error ? error.message : String(error)}`,
        );
        return null;
      }

      // Validate required fields
      if (!event.eventId || typeof event.eventId !== 'string') {
        this.logger.warn('Event missing required field: eventId');
        return null;
      }

      if (!event.type || typeof event.type !== 'string') {
        this.logger.warn('Event missing required field: type');
        return null;
      }

      if (!event.data || typeof event.data !== 'object') {
        this.logger.warn('Event missing required field: data');
        return null;
      }

      return event as AppEvent;
    } catch (error) {
      this.logger.error(
        `Unexpected error validating event: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  /**
   * Process event with timeout protection
   * Prevents stuck processing that could block the subscriber
   */
  private async processEventWithTimeout(
    event: AppEvent,
    processedRecord: ProcessedEvent | null,
  ): Promise<void> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      const timeout = setTimeout(() => {
        reject(
          new Error(
            `Event processing timeout after ${DEFAULT_PROCESSING_TIMEOUT_MS}ms`,
          ),
        );
      }, DEFAULT_PROCESSING_TIMEOUT_MS);

      // Cleanup timeout if processing completes
      return () => clearTimeout(timeout);
    });

    try {
      // Race between processing and timeout
      await Promise.race([
        this.eventHandlerService.handleEvent(event),
        timeoutPromise,
      ]);
    } catch (error) {
      // Update retry tracking before re-throwing
      if (processedRecord) {
        await this.updateProcessedEventError(
          event.eventId,
          error instanceof Error ? error.message : String(error),
          processedRecord.retryCount,
        );
      }
      throw error;
    }
  }

  /**
   * Get processed event record if exists
   */
  private async getProcessedEventRecord(
    eventId: string,
  ): Promise<ProcessedEvent | null> {
    try {
      const processed = await this.processedEventRepo.findOne({
        where: { eventId },
      });
      return processed || null;
    } catch (error) {
      this.logger.error(
        `Error checking if event processed: ${error instanceof Error ? error.message : String(error)}`,
      );
      // On error, assume not processed (let it try again)
      return null;
    }
  }

  /**
   * Check if event has already been processed (legacy method for compatibility)
   */
  private async isEventProcessed(eventId: string): Promise<boolean> {
    const record = await this.getProcessedEventRecord(eventId);
    return record?.isProcessed ?? false;
  }

  /**
   * Mark event as processed in database
   * Includes retry tracking for observability
   */
  private async markEventAsProcessed(event: AppEvent): Promise<void> {
    try {
      const existingRecord = await this.getProcessedEventRecord(event.eventId);

      if (existingRecord) {
        // Update existing record
        existingRecord.isProcessed = true;
        existingRecord.lastError = undefined;
        await this.processedEventRepo.save(existingRecord);
        this.logger.debug(
          `✓ Event marked as processed (retry #${existingRecord.retryCount}): ${event.eventId}`,
        );
      } else {
        // Create new record
        const processedEvent = new ProcessedEvent();
        processedEvent.eventId = event.eventId;
        processedEvent.eventType = event.type;
        processedEvent.isProcessed = true;
        processedEvent.retryCount = 0;
        await this.processedEventRepo.save(processedEvent);
        this.logger.debug(`✓ Event marked as processed: ${event.eventId}`);
      }
    } catch (error) {
      this.logger.error(
        `Error marking event as processed: ${error instanceof Error ? error.message : String(error)}`,
      );
      // Don't throw - continue even if we can't record it
    }
  }

  /**
   * Update processed event with error info and retry count
   * For reliability monitoring
   */
  private async updateProcessedEventError(
    eventId: string,
    errorMessage: string,
    retryCount: number,
  ): Promise<void> {
    try {
      let record = await this.getProcessedEventRecord(eventId);

      if (!record) {
        // Create new record without marking as processed
        record = new ProcessedEvent();
        record.eventId = eventId;
        record.retryCount = retryCount;
        record.lastError = errorMessage;
        record.isProcessed = false;
      } else {
        // Update existing record
        record.retryCount = retryCount;
        record.lastError = errorMessage;
      }

      if (record) {
        await this.processedEventRepo.save(record);

        // Alert if max retries exceeded
        if (retryCount >= MAX_RETRIES_BEFORE_ALERT) {
          this.logger.error(
            `⚠️ Event exceeded max retry threshold (${MAX_RETRIES_BEFORE_ALERT}): ${eventId}. Last error: ${errorMessage}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Error updating processed event: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
