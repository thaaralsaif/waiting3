# Firebase Authentication + Roles

The application no longer uses the client-side admin PIN. Administration requires Firebase Authentication and a custom `role` claim.

## Supported roles

- `admin`: full administration
- `supervisor`: administration dashboard and supervisor functions
- `staff`: queue operations
- `viewer`: read-only access

## Firebase Console

1. Enable **Authentication → Sign-in method → Email/Password**.
2. Create the staff/admin users in Firebase Authentication.
3. Assign a custom claim named `role` to each user using a trusted server environment (Firebase Admin SDK or Cloud Functions). Never put a service-account key or Admin SDK credentials in the React app.

Example server-side operation:

```js
await admin.auth().setCustomUserClaims(uid, { role: 'admin' });
```

After changing a claim, the user should sign out/in again (or refresh the ID token) so the new role is present.

## Rules

`database.rules.json` and `firestore.rules` require authentication and an allowed role. The React client cannot elevate its own role.

## Important architecture note

The current queue document is still a single shared `AppState`. Authentication and transactions now protect the critical queue path, but production hardening should eventually split the data into organization/branch scoped documents and use least-privilege rules per operation rather than allowing staff to write the entire state document.
