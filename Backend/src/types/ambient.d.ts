// Minimal ambient module declarations to silence TypeScript errors in the
// editor when backend devDependencies are not installed. These are temporary
// and safe for development; install real types with `npm ci` to replace them.
declare module 'express';
declare module 'jsonwebtoken';
declare module 'socket.io';
declare module 'express-rate-limit';
declare module 'bcryptjs';
declare module 'cors';
declare module 'zod';

// Allow importing json files in TS if needed
declare module '*.json';
