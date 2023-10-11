import { FactoryProvider } from '@nestjs/common';
import { createClient } from 'redis';
import { RedisClient, REDIS_CLIENT } from './redis-client.type';

export const redisClientFactory: FactoryProvider<Promise<RedisClient>> = {
  provide: REDIS_CLIENT,
  useFactory: async () => {
    const client = createClient({
      // url: 'redis://redis:6379',
      // url: 'redis://localhost:6379',
      url: 'redis://brainlife_redis:6379',
    });
    await client.connect();
    return client;
  },
};
