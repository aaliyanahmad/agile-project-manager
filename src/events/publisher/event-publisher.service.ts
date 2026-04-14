import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { PubSub, Topic } from '@google-cloud/pubsub';
import { AppEvent } from '../interfaces/app-event.interface';
import { EventType } from '../enums/event-type.enum';
import { pubSubConfig, validatePubSubConfig } from '../pubsub.config';

@Injectable()
export class EventPublisherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventPublisherService.name);
  private pubSubClient: PubSub | null = null;
  private topic: Topic | null = null;
  private isInitialized = false;

  private tempCredentialsFile: string | null = null;

  async onModuleInit(): Promise<void> {
    try {
      // Validate configuration (logs warning if not fully configured)
      validatePubSubConfig();

      // If credentials are provided, write them to a temporary file and set the env var
      // Do this BEFORE creating the PubSub client
      if (pubSubConfig.credentials) {
        const tempDir = os.tmpdir();
        this.tempCredentialsFile = path.join(
          tempDir,
          `gcp-creds-${uuidv4()}.json`,
        );

        // Write credentials to file
        const credsJson = JSON.stringify(pubSubConfig.credentials);
        fs.writeFileSync(this.tempCredentialsFile, credsJson);
        
        // Verify file was written
        if (fs.existsSync(this.tempCredentialsFile)) {
          this.logger.log(
            `✓ Service account credentials written to: ${this.tempCredentialsFile}`,
          );
        } else {
          this.logger.error(
            `Failed to write credentials file to: ${this.tempCredentialsFile}`,
          );
        }

        // Set the environment variable BEFORE creating PubSub client
        process.env.GOOGLE_APPLICATION_CREDENTIALS = this.tempCredentialsFile;
        this.logger.log(
          `✓ GOOGLE_APPLICATION_CREDENTIALS set to: ${this.tempCredentialsFile}`,
        );
      }

      // Initialize Pub/Sub client (will use GOOGLE_APPLICATION_CREDENTIALS if set)
      this.pubSubClient = new PubSub({
        projectId: pubSubConfig.projectId,
      });
      this.logger.log(
        `✓ PubSub client initialized for project: ${pubSubConfig.projectId}`,
      );

      // Get or reference the topic
      this.topic = this.pubSubClient.topic(pubSubConfig.topicName);

      // Verify topic exists (don't fail if it doesn't)
      try {
        const exists = await this.topic.exists();
        if (exists[0]) {
          this.logger.log(
            `✓ Connected to Pub/Sub topic: ${pubSubConfig.topicName}`,
          );
        } else {
          this.logger.warn(
            `⚠ Pub/Sub topic "${pubSubConfig.topicName}" does not exist. Will attempt to publish anyway.`,
          );
        }
      } catch (error) {
        this.logger.warn(
          `⚠ Could not verify Pub/Sub topic "${pubSubConfig.topicName}". Will attempt to publish anyway. Error: ${error.message}`,
        );
      }

      this.isInitialized = true;
      this.logger.log(
        `✓ EventPublisherService fully initialized and ready to publish events`,
      );
    } catch (error) {
      // Log error but don't fail - allow graceful degradation
      this.logger.warn(
        `⚠ Pub/Sub initialization encountered an issue: ${error.message}. Events will not be published. Error: ${error.stack}`,
      );
      this.isInitialized = false;
    }
  }

  /**
   * Publish an event to Google Pub/Sub
   * This is fire-and-forget - errors are logged but do not throw or break the API
   */
  async publish(event: AppEvent): Promise<void> {
    // Early return if not initialized (graceful degradation)
    if (!this.isInitialized || !this.topic) {
      this.logger.warn(
        `Pub/Sub not initialized. Event not published: ${event.type}`,
      );
      return;
    }

    try {
      // Serialize event safely to buffer
      const buffer = this.serializeEvent(event);

      // Publish to Pub/Sub
      const messageId = await this.topic.publishMessage({
        data: buffer,
      });

      // Log successful publication
      this.logger.log(
        `Event Published: ${event.type} [messageId: ${messageId}]`,
      );
    } catch (error) {
      // Log error but do not throw - keep API working
      this.logger.error(
        `Pub/Sub publish failed for event ${event.type}: ${error.message}`,
        error.stack,
      );
      // Silently fail - do not break the API
    }
  }

  /**
   * Safely serialize event to Buffer
   * Ensures no circular references and only necessary fields are sent
   */
  private serializeEvent(event: AppEvent): Buffer {
    const serialized = {
      eventId: event.eventId,
      type: event.type,
      data: {
        ticketId: event.data.ticketId,
        projectId: event.data.projectId,
        performedBy: event.data.performedBy,
        targetUsers: event.data.targetUsers,
        metadata: event.data.metadata,
      },
      createdAt: event.createdAt.toISOString(),
    };

    return Buffer.from(JSON.stringify(serialized));
  }

  /**
   * Create an event payload with auto-generated eventId and createdAt
   */
  createEvent(
    type: EventType,
    data: {
      ticketId?: string;
      projectId?: string;
      performedBy: string;
      targetUsers: string[];
      metadata?: any;
    },
  ): AppEvent {
    return {
      eventId: uuidv4(),
      type,
      data,
      createdAt: new Date(),
    };
  }

  /**
   * Cleanup: Delete temporary credentials file on module destroy
   */
  onModuleDestroy(): void {
    if (this.tempCredentialsFile) {
      try {
        if (fs.existsSync(this.tempCredentialsFile)) {
          fs.unlinkSync(this.tempCredentialsFile);
          this.logger.debug(
            `Deleted temporary credentials file: ${this.tempCredentialsFile}`,
          );
        }
      } catch (error) {
        this.logger.warn(
          `Failed to delete temporary credentials file: ${error.message}`,
        );
      }
    }
  }
}
