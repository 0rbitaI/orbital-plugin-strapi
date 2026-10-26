const { test } = require('node:test');
const assert = require('node:assert/strict');
const { sign } = require('jsonwebtoken');
const { config } = require('dotenv');
const path = require('node:path');
config({ path: process.env.STRAPI_ENV_FILE || path.resolve(process.cwd(), '.env'), quiet: true });
const base = process.env.ORBITAL_NEWS_TEST_URL || 'http://localhost:1337';

// Requires a running local Strapi; no users, permissions or application data are changed.
test('admin route rejects anonymous access and arbitrary browser URLs', async () => {
  const response = await fetch(base + '/orbital-news/articles?url=https://example.com');
  assert.equal(response.status, 401);
});
test('admin route rejects an invalid bearer token', async () => {
  const response = await fetch(base + '/orbital-news/articles', { headers: { Authorization: 'Bearer invalid' } });
  assert.equal(response.status, 401);
});
test('a content API token cannot access the admin route', async () => {
  assert.ok(process.env.JWT_SECRET, 'JWT_SECRET is required for the local access test');
  const token = sign({ id: 1 }, process.env.JWT_SECRET, { expiresIn: '1m' });
  const response = await fetch(base + '/orbital-news/articles', { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(response.status, 401);
});
test('there is no public content API endpoint for blog articles', async () => {
  const response = await fetch(base + '/api/orbital-news/articles');
  assert.equal(response.status, 404);
});
