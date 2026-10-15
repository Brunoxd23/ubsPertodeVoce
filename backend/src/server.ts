import { buildApp } from './app.js';
import { env } from './config/env.js';
import { getUbsRepository } from './db/client.js';

async function bootstrap() {
  const app = buildApp();

  // Inicializa repositório e checa conectividade
  await getUbsRepository();

  try {
    await app.listen({
      port: env.PORT,
      host: env.HOST,
    });

    console.log(`\n======================================================`);
    console.log(`🏥 UBS Perto de Você - API REST v1.0.0 em execução!`);
    console.log(`🌐 Servidor: http://${env.HOST === '0.0.0.0' ? 'localhost' : env.HOST}:${env.PORT}`);
    console.log(`📑 Documentação OpenAPI/Swagger: http://localhost:${env.PORT}/docs`);
    console.log(`🩺 Health Check: http://localhost:${env.PORT}/api/v1/health`);
    console.log(`📍 Endpoint UBS: http://localhost:${env.PORT}/api/v1/ubs`);
    console.log(`======================================================\n`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

bootstrap();
