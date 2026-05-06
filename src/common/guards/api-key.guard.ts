import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const key = req.headers['x-api-key'];
    if (!key || key !== process.env.API_KEY) {
      throw new UnauthorizedException('API key inválida');
    }
    return true;
  }
}
