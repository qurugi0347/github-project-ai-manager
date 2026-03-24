import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class GithubExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // Already sent
    if (response.headersSent) return;

    // GitHub GraphQL error
    if (exception?.name === 'GraphqlResponseError' || exception?.errors) {
      const ghErrors = exception.errors || [];
      const firstError = ghErrors[0];

      let status = HttpStatus.BAD_GATEWAY;
      let message = 'GitHub API error';

      if (firstError?.type === 'NOT_FOUND') {
        status = HttpStatus.NOT_FOUND;
        message = firstError.message;
      } else if (firstError?.type === 'FORBIDDEN') {
        status = HttpStatus.FORBIDDEN;
        message = 'GitHub API permission denied. Check your token scopes.';
      } else if (exception?.status === 401) {
        status = HttpStatus.UNAUTHORIZED;
        message = 'GitHub authentication failed. Run "gh auth login".';
      } else if (firstError?.message) {
        message = firstError.message;
      }

      // Rate limit
      const rateLimitRemaining = exception?.headers?.['x-ratelimit-remaining'];
      if (rateLimitRemaining === '0') {
        status = HttpStatus.TOO_MANY_REQUESTS;
        message = 'GitHub API rate limit exceeded. Try again later.';
      }

      response.status(status).json({ statusCode: status, message });
      return;
    }

    // Standard Error with message
    if (exception instanceof Error) {
      const status = (exception as any).status || HttpStatus.INTERNAL_SERVER_ERROR;
      response.status(status).json({
        statusCode: status,
        message: exception.message,
      });
      return;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    });
  }
}
