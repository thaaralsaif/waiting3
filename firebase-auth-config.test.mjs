import assert from 'node:assert/strict';
import fs from 'node:fs';

const authSource = fs.readFileSync(new URL('../src/services/firebaseAuth.ts', import.meta.url), 'utf8');
const rtdbRules = JSON.parse(fs.readFileSync(new URL('../database.rules.json', import.meta.url), 'utf8'));
const firestoreRules = fs.readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');

for (const role of ['admin', 'supervisor', 'staff', 'viewer']) {
  assert.match(authSource, new RegExp(`['\"]${role}['\"]`), `Auth source must recognize role ${role}`);
}
assert.match(authSource, /getIdTokenResult\(true\)/, 'Role must be refreshed from Firebase ID token');
assert.match(authSource, /signInWithEmailAndPassword/, 'Email/password auth must be enabled in client integration');
assert.match(authSource, /signOut\(/, 'Logout must be wired');

const rules = rtdbRules.rules.smart_queue_live_state;
assert.match(rules['.read'], /auth != null/);
assert.match(rules['.write'], /auth != null/);
for (const role of ['admin', 'supervisor', 'staff', 'viewer']) {
  assert.match(rules['.read'], new RegExp(`auth\.token\.role == '${role}'`));
}
for (const role of ['admin', 'supervisor', 'staff']) {
  assert.match(rules['.write'], new RegExp(`auth\.token\.role == '${role}'`));
}
assert.doesNotMatch(rules['.write'], /viewer/);
assert.doesNotMatch(rules['.write'], /auth != null\s*$/);

assert.match(firestoreRules, /request\.auth != null/);
assert.match(firestoreRules, /request\.auth\.token\.role == role/);
assert.match(firestoreRules, /allow read: if canRead\(\)/);
assert.match(firestoreRules, /allow create, update, delete: if canWrite\(\)/);

console.log('PASS Firebase Auth + role/rules static contract');
