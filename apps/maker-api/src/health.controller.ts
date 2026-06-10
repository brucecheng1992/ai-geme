import { Controller, Get } from '@nestjs/common';

type HealthResponse = {
  service: 'maker-api';
  status: 'ok';
};

@Controller('health')
export class HealthController {
  @Get()
  getHealth(): HealthResponse {
    return {
      service: 'maker-api',
      status: 'ok'
    };
  }
}
