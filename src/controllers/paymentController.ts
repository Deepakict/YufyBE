import { Request, Response } from 'express';
import { errorResponse, successResponse } from '../utilities/responseWrapper';
import db from '../config/db';
import axios from 'axios';


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

export const addPaymentRequestNew = async (req: Request, res: Response): Promise<void> => {
  const data = req.body;

  const requiredFields = [
    'Contact',
    'Amount',
    'Name',
    'Email',
    'Status',
    'Payment_Id',
    'RazorpayOrderid',
  ];

  const missingFields = requiredFields.filter((field) => !data[field]);
  if (missingFields.length > 0) {
    errorResponse(res, `Missing required fields: ${missingFields.join(', ')}`, 400);
    return;
  }

  try {
    const {
      Contact,
      Amount,
      Name,
      Email,
      Status,
      Payment_Id,
      RazorpayOrderid,
      fromAmount = '',
    } = data;

    const now = new Date();

    // If payment is cancelled
    if (Status === 'Payment Cancelled') {
      await db('AddUserAmountDetail').insert({
        Contact,
        Amount,
        Name,
        Email,
        PaymentStatus: 'IssueWhilePayment',
        Status: 'PaymentFail',
        Date: now,
        Payment_Id: 'PaymentFail',
        RazorpayOrderid,
      });

      successResponse(res, 'Failed');
      return;
    }

    // ✅ Add successful payment details
    await db('AddUserAmountDetail').insert({
      Contact,
      Amount,
      Name,
      Email,
      Status,
      Date: now,
      Payment_Id,
      RazorpayOrderid,
    });

    // ✅ Update user wallet
    if (fromAmount !== 'Schedule') {
      const wallet = await db('UserWallet').where('UserMobileNo', Contact).first();
      const total = parseFloat(wallet?.UserAmountInWallet || '0') + parseFloat(Amount);
      await db('UserWallet')
        .where('UserMobileNo', Contact)
        .update({ UserAmountInWallet: total.toFixed(2) });
    }

    // ✅ Verify Razorpay payment
    const creds = await db('RazorpayX').first();
    const auth = Buffer.from(`${creds.User_Name}:${creds.Password}`).toString('base64');

    const paymentRes = await axios.get(`https://api.razorpay.com/v1/payments/${Payment_Id}`, {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: 'application/json',
      },
    });

    const paymentData = paymentRes.data;

    // ✅ Log the transaction
    await db('UserTransaction').insert({
      MobileNumber: Contact,
      TransactionType: 'Credited Points',
      UserAmount: Amount,
      RazorpayStatus: 'success',
      RazorpaypaymentId: Payment_Id,
      RazorpayCreated: now,
    });

    if (['authorized', 'captured'].includes(paymentData.status)) {
      successResponse(res, 'Details added successfully');
    } else {
      successResponse(res, 'Failed');
    }
  } catch (error) {
    console.error('Payment add error:', error);

    await db('WebhookLog').insert({
      Message: error instanceof Error ? error.message : String(error),
      Date: new Date(),
      PaymentStatus: 'AddPaymentRequestNew',
      RazorpayOrderid: 'PaymentController',
    });

    errorResponse(res, 'Internal server error', 500);
  }
};

