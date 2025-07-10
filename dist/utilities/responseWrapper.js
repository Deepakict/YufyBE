"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorResponse = exports.successResponse = void 0;
const successResponse = (res, message, data = null, code = 200, status = 'OK') => {
    const response = {
        success: true,
        message,
        code,
        status,
        data,
    };
    res.status(code).json(response);
};
exports.successResponse = successResponse;
const errorResponse = (res, message, code = 400, status = 'Bad Request', data = null) => {
    const response = {
        success: false,
        message,
        code,
        status,
        data,
    };
    res.status(code).json(response);
};
exports.errorResponse = errorResponse;
