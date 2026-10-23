import client from 'prom-client';

const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });
export { registry };
