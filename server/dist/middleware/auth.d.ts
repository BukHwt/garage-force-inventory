import { NextFunction, Request, Response } from 'express';
export declare function authenticate(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
export declare function requireEditor(req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
