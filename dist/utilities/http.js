"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSuccess = exports.sendCreateSuccess = exports.asyncMiddleware = void 0;
const asyncMiddleware = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
exports.asyncMiddleware = asyncMiddleware;
const sendCreateSuccess = (res, message) => (data) => {
    res.statusMessage = message;
    res.status(201).json(data);
};
exports.sendCreateSuccess = sendCreateSuccess;
const sendSuccess = (res, message) => (data) => {
    res.statusMessage = message;
    if (!res.headersSent) {
        res.status(200).json(data);
    }
};
exports.sendSuccess = sendSuccess;
