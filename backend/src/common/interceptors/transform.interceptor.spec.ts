import { lastValueFrom, of } from 'rxjs';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { TransformInterceptor } from './transform.interceptor';

describe('TransformInterceptor', () => {
  const interceptor = new TransformInterceptor<unknown>();

  const mockContext = {} as ExecutionContext;

  it('wraps the handler result in a success envelope', async () => {
    const next: CallHandler = { handle: () => of({ id: '1', name: 'Alice' }) };

    const result = await lastValueFrom(interceptor.intercept(mockContext, next));

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ id: '1', name: 'Alice' });
    expect(typeof result.timestamp).toBe('string');
  });

  it('preserves array payloads', async () => {
    const next: CallHandler = { handle: () => of([1, 2, 3]) };
    const result = await lastValueFrom(interceptor.intercept(mockContext, next));
    expect(result.data).toEqual([1, 2, 3]);
  });
});
