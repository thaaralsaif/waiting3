import assert from 'node:assert/strict';
import fs from 'node:fs';

const notifications = fs.readFileSync(new URL('../src/utils/notifications.ts', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const tracker = fs.readFileSync(new URL('../src/components/TrackerView.tsx', import.meta.url), 'utf8');
const firebase = fs.readFileSync(new URL('../src/services/firebaseService.ts', import.meta.url), 'utf8');
const rtdb = JSON.parse(fs.readFileSync(new URL('../database.rules.json', import.meta.url), 'utf8'));
const firestore = fs.readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
const types = fs.readFileSync(new URL('../src/types.ts', import.meta.url), 'utf8');

assert.match(types, /publicTrackToken\?: string/);
assert.match(notifications, /params\.set\('track', ticket\.publicTrackToken\)/);
assert.doesNotMatch(notifications, /params\.set\('name'/);
assert.doesNotMatch(notifications, /params\.set\('svc'/);
assert.doesNotMatch(notifications, /params\.set\('time'/);
assert.match(firebase, /public_trackers\/\$\{snapshot\.token\}/);
assert.match(firebase, /public_trackers/);
assert.match(app, /subscribePublicTracker/);
assert.doesNotMatch(app, /t_recovered_/);
assert.doesNotMatch(app, /urlParams\.get\('name'\)/);
assert.doesNotMatch(app, /urlParams\.get\('svc'\)/);
assert.match(tracker, /publicTracker/);

const publicRules = rtdb.rules.public_trackers.$token;
assert.equal(publicRules['.read'], true, 'Public tracker read should be public by opaque token only');
assert.match(publicRules['.write'], /auth != null/);
assert.match(publicRules['.validate'], /newData\.child\('token'\)\.val\(\) == \$token/);
assert.match(firestore, /match \/public_trackers\/\{token\}/);
assert.match(firestore, /allow read: if true/);
assert.match(firestore, /allow create, update, delete: if canWrite\(\)/);

console.log('PASS public QR security contract: opaque token + sanitized public read model');
