import { Request, Response } from 'express';
import { errorResponse, successResponse } from '../utilities/responseWrapper';
import db from '../config/db';


export const getUserWalletInfo = async (req: Request, res: Response): Promise<void> => {
  const { UserMobileNo } = req.body;

  if (!UserMobileNo) {
    errorResponse(res, 'UserMobileNo is required', 400);
    return;
  }

  try {
    const wallet = await db('UserWallet')
      .where({ UserMobileNo })
      .first(); // Only one wallet

    if (!wallet) {
      errorResponse(res, 'No wallet found', 404);
      return;
    }

    successResponse(res, 'Wallet info fetched successfully', wallet);
  } catch (error) {
    console.error('Error fetching wallet info:', error);
    errorResponse(res, 'Failed to fetch wallet info', 500);
  }
};

export const getRazorpayKeys = async (req: Request, res: Response): Promise<void> => {
  try {
    const razorpayKeys = await db('RazorpayX').select(); // assumes table name is RazorpayX
    successResponse(res, 'Razorpay keys fetched successfully', razorpayKeys);
  } catch (error: any) {
    console.error('Error fetching Razorpay keys:', error);
    errorResponse(res, 'Failed to fetch Razorpay keys', 500);
  }
};