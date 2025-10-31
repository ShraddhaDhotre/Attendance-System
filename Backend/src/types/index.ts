import { Request, Response } from 'express';

export interface AuthenticatedUser {
  id: number;
  email: string;
  role: 'ADMIN' | 'FACULTY' | 'STUDENT';
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
