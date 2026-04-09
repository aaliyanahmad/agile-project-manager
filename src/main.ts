import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('Agile Project Manager API')
    .setDescription('Developer-focused Agile Project Management Tool - MVP V1')
    .setVersion('1.0')
    .addBearerAuth()           // Enable JWT/Auth if you're using authentication
    .build();

  const document = SwaggerModule.createDocument(app, config);
  
  // Setup Swagger UI at /api
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,   // Keeps token after refresh
    },
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
  console.log(`Swagger UI: http://localhost:3000/api`);
}
bootstrap();
