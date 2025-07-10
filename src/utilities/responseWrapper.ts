import { Response } from 'express';

type ApiResponse<T = any> = {
  success: boolean;
  message: string;
  code: number;
  status: string;
  data: T | null;
};

export interface SuccessResponseParams<T = any> {
    res: Response;
    message: string;
    data?: T | null;
    code?: number;
    status?: string;
}

export const successResponse = <T = any>(
    res: Response,
    message: string,
    data: T | null = null,
    code: number = 200,
    status: string = 'OK'
): void => {
    const response: ApiResponse<T> = {
        success: true,
        message,
        code,
        status,
        data,
    };
    res.status(code).json(response);
};

export interface ErrorResponseParams<T = any> {
    res: Response;
    message: string;
    code?: number;
    status?: string;
    data?: T | null;
}

export const errorResponse = <T = any>(
    res: Response,
    message: string,
    code: number = 400,
    status: string = 'Bad Request',
    data: T | null = null
): void => {
    const response: ApiResponse<T> = {
        success: false,
        message,
        code,
        status,
        data,
    };
    res.status(code).json(response);
};