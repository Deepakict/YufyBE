import { Request, Response } from 'express';
import db from '../config/db';
import { DateTime } from 'luxon';
import { errorResponse, successResponse } from '../utilities/responseWrapper';

// Booking ID Generator
const generateBookingId = (): string => {
  return `BOOK-${Date.now()}`;
};

export const bookingOrderNew = async (req: Request, res: Response): Promise<void> => {
  const data = req.body;

  if (!data || !data.OrderBy || !data.responseDates || !data.Itemsid) {
    errorResponse(res, 'Missing required fields', 400);
    return;
  }

  const trx = await db.transaction();
  try {
    // Generate new transaction number
    const lastTrans = await trx('OrderBookingTable').orderBy('TransactionNo', 'desc').first();
    const transactionNo = lastTrans ? lastTrans.TransactionNo + 1 : 1;

    const user = await trx('ZufyUserData').where('ContactNumber', data.OrderBy).first();
    if (!user) {
      await trx.rollback();
      return errorResponse(res, 'User not found', 404);
    }

    const bookingId = generateBookingId();
    const jobDate = data.responseDates[0]?.job_date || null;
    const jobTime = data.responseDates[0]?.job_time || null;

    const helperGetAmount = parseFloat(data.ItemsAmount) - parseFloat(data.AppliedTaxAmount);
    let helperGetWithoutDiscount = 0;

    if (data.ItemsAmountWithoutDiscount) {
      helperGetWithoutDiscount = parseFloat(data.ItemsAmountWithoutDiscount) - parseFloat(data.YufyConvWithoutDiscount);
    }

    await trx('OrderBookingTable').insert({
      Itemsid: data.Itemsid[0],
      BookingId: bookingId,
      ItemsAmountWithoutDiscount: parseFloat(data.ItemsAmountWithoutDiscount).toFixed(2),
      ItemsAmount: parseFloat(data.ItemsAmount).toFixed(2),
      ItemCreatedDate: new Date(),
      ItemModifiedDate: new Date(),
      ConvenienceFee: parseFloat(data.ConvenienceFee).toFixed(2),
      GstTax: parseFloat(data.GstTax).toFixed(2),
      OrderBy: data.OrderBy,
      UserName: data.UserName,
      OrderGenratedLat: data.OrderGenratedLat,
      OrderGenratedLong: data.OrderGenratedLong,
      ClothItem: data.ClothItem,
      CookingPerson: data.CookingPerson,
      CookingPeriods: data.CookingPeriods,
      VegitableChopping: data.VegitableChopping,
      CookingItem: data.CookingItem,
      BathroomCount: data.BathroomCount,
      AddonsMapped: data.AddonsMapped,
      useraddress: data.useraddress,
      Housetype: data.Housetype,
      OrderStatus: 'Pending',
      languages: data.languages,
      Gender: data.Gender,
      responseDates: jobDate,
      responseTime: jobTime,
      ItemTotalAmount: parseFloat(data.ItemTotalAmount).toFixed(2),
      YufyConvWithoutDiscount: parseFloat(data.YufyConvWithoutDiscount).toFixed(2),
      AppliedTaxAmount: parseFloat(data.AppliedTaxAmount).toFixed(2),
      AmountHelperGet: helperGetAmount.toFixed(2),
      AmountHelperGetWithoutDiscount: helperGetWithoutDiscount.toFixed(2),
      TotalDiscount: parseFloat(data.TotalDiscount).toFixed(2),
      offerAmount: data.offerAmount,
      offerDays: data.offerDays,
      favouriteHelpers: JSON.stringify(data.favouriteHelpers),
      TransactionNo: transactionNo,
      RazorpayOrderid: data.RazorpayOrderid,
    });

    await trx('ZufyUserData')
      .where('ContactNumber', data.OrderBy)
      .update({
        Languages: data.languages,
        Gender: data.Gender,
        PermanentAddress: data.useraddress,
      });

    await trx('WalletTansaction').insert({
      RazorpayOrderid: data.RazorpayOrderid,
      walletfromamount: parseFloat(data.walletfromamount),
      walletbalance: parseFloat(data.walletbalance),
      amounttobepaid: parseFloat(data.amounttobepaid),
      created_at: new Date(),
      is_processed: 0,
    });

    await trx.commit();
    successResponse(res, 'Booking Order Registered Successfully', {
      transactionNo,
      bookingId,
    });
  } catch (error) {
    await trx.rollback();
    await db('WebhookLog').insert([
      {
        Message: (error instanceof Error ? error.message : String(error)),
        Date: new Date(),
        PaymentStatus: data.RazorpayOrderid,
        RazorpayOrderid: data.RazorpayOrderid,
      },
      {
        Message: (error instanceof Error ? error.message : String(error)),
        Date: new Date(),
        PaymentStatus: 'BookingOrderNew',
        RazorpayOrderid: 'OrderController',
      },
    ]);

    console.error('Booking order error:', error);
    errorResponse(res, 'Booking failed: ' + error, 500);
  }
};


export const trackHelperAvailabilityData = async (req: Request, res: Response): Promise<void> => {
  const data = req.body;

  const requiredFields = [
    'HelperMobileNo',
    'HelperName',
    'BookingID',
    'BlockedDateTime',
    'ReleaseDateTime',
    'BreakTime',
    'Duration',
    'WorkStatus',
    'BlockReason',
    'BlockStatus'
  ];

  const missingFields = requiredFields.filter((field) => !data[field]);

  if (missingFields.length > 0) {
    errorResponse(res, `Missing required fields: ${missingFields.join(', ')}`, 400);
    return;
  }

  try {
    // Log activity in WebhookLog
    await db('WebhookLog').insert({
      Message: 'Details added in TrackHelperAvailabiltyData',
      Date: new Date(),
      PaymentStatus: data.BlockedDateTime,
      RazorpayOrderid: data.Duration,
    });

    // Insert helper tracking record (store all as strings for TEXT columns)
    await db('TrackHelperAvailabiltyData').insert({
      HelperMobileNo: data.HelperMobileNo,
      HelperName: data.HelperName,
      BookingId: data.BookingID,
      BlockedDateTime: data.BlockedDateTime,
      ReleaseDateTime: data.ReleaseDateTime,
      BreakTime: data.BreakTime,
      Duration: data.Duration,
      WorkStatus: data.WorkStatus,
      BlockStatus: data.BlockStatus,
      BlockReason: data.BlockReason,
      created_at: new Date(),
      is_processed: '0',
    });

    successResponse(res, 'Success');
  } catch (error) {
    console.error('Error in trackHelperAvailabilityData:', error);
    await db('WebhookLog').insert({
      Message: error instanceof Error ? error.message : String(error),
      Date: new Date(),
      PaymentStatus: 'TrackHelperAvailabilityData',
      RazorpayOrderid: 'OrderController',
    });

    errorResponse(res, 'Failed to track helper availability', 500);
  }
};
