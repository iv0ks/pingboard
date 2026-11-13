// Health check controller. Returns the literal "ok" for the Docker HEALTHCHECK.
import { Controller, Get, Header } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get('healthz')
  @Header('content-type', 'text/plain')
  health(): string {
    return 'ok';
  }
}
