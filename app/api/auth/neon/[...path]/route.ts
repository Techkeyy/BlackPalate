import { neonAuth } from '@/lib/auth';

export const { GET, POST, PUT, DELETE, PATCH } = neonAuth.handler();

