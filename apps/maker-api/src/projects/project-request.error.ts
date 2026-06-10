import { BadRequestException } from '@nestjs/common';

export class ProjectRequestError extends BadRequestException {
  constructor(message: string) {
    super({ ok: false, message });
  }
}
