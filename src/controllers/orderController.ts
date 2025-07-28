import { Request, Response } from 'express';
import db from '../config/db';
import { errorResponse, successResponse } from '../utilities/responseWrapper';
import { checkAddonsCount, getJobTitle } from '../utilities/commonMethords';
import { v4 as uuidv4 } from 'uuid';
import moment from 'moment';

// Booking ID Generator
const generateBookingId = (): string => {
  return `BOOK-${Date.now()}`;
};

export const bookingOrderNew = async (req: Request, res: Response): Promise<void> => {
  const data = req.body;

  if (!data || !data.OrderBy || !Array.isArray(data.responseDates) || !data.Itemsid) {
    errorResponse(res, 'Missing required fields', 400);
    return;
  }

  const trx = await db.transaction();
  try {
    const lastTrans = await trx('OrderBookingTable').orderBy('TransactionNo', 'desc').first();
    const transactionNo = lastTrans ? lastTrans.TransactionNo + 1 : 1;

    const user = await trx('ZufyUserData').where('ContactNumber', data.OrderBy).first();
    if (!user) {
      await trx.rollback();
      return errorResponse(res, 'User not found', 404);
    }

    const bookings = [];

    for (const entry of data.responseDates) {
      const bookingId = generateBookingId();
      const jobDate = entry.job_date;
      const jobTime = entry.job_time;
      const helperName = entry.UserName || data.UserName;

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
        UserName: helperName,
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

      bookings.push({
        bookingId,
        job_date: jobDate,
        job_time: jobTime,
        helperId: entry.HelperId,
      });
    }

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
      bookings,
    });
  } catch (error) {
    await trx.rollback();
    await db('WebhookLog').insert([
      {
        Message: error instanceof Error ? error.message : String(error),
        Date: new Date(),
        PaymentStatus: data.RazorpayOrderid,
        RazorpayOrderid: data.RazorpayOrderid,
      },
      {
        Message: error instanceof Error ? error.message : String(error),
        Date: new Date(),
        PaymentStatus: 'BookingOrderNew',
        RazorpayOrderid: 'OrderController',
      },
    ]);

    console.error('Booking order error:', error);
    errorResponse(res, 'Booking failed: ' + error, 500);
  }
};

export const updateBookingOrderPaysuccess = async (req: Request, res: Response): Promise<void> => {
  const data = req.body;

  if (!data || !data.OrderBy || !data.BookingId || !data.ItemTotalAmount) {
    errorResponse(res, 'Missing required fields: OrderBy, BookingId, or ItemTotalAmount', 400);
    return;
  }

  const bookingIds: string[] = data.BookingId.split(',');
  let totalBlockAmount = 0;

  try {
    for (const bookingId of bookingIds) {
      const order = await db('OrderBookingTable')
        .where({ BookingId: bookingId })
        .andWhere((builder: any) => {
          builder.whereNull('RazorpayPaymentid').orWhere('RazorpayPaymentid', '');
        })
        .first();

      if (!order) continue;

      await db('OrderBookingTable')
        .where({ BookingId: bookingId })
        .update({ RazorpayPaymentid: data.RazorpayPaymentid });

      totalBlockAmount += parseFloat(data.ItemTotalAmount);

      const user = await db('ZufyUserData').where({ ContactNumber: data.OrderBy }).first();
      const helperTrack = await db('TrackHelperAvailabiltyData')
        .where({ BookingId: bookingId, is_processed: '0' })
        .first();

      const helperName: string = helperTrack?.HelperName || '-';

      const msg = `Scheduled Booking <pre>    </pre>
<pre>Booking Id: ${bookingId}</pre>
<pre>    </pre>
<pre>Name: ${order.UserName}</pre>
<pre>    </pre>
<pre>Mobile: ${order.OrderBy}</pre>
<pre>    </pre>
<pre>Gender Preference: ${order.Gender}</pre>
<pre>    </pre>
<pre>Address: ${order.useraddress}</pre>
<pre>    </pre>
<pre>Latitude: ${order.OrderGenratedLat}</pre>
<pre>    </pre>
<pre>Longitude: ${order.OrderGenratedLong}</pre>
<pre>    </pre>
<pre>House Size: ${order.Housetype}</pre>
<pre>    </pre>
<pre>Date: ${order.responseDates}</pre>
<pre>    </pre>
<pre>Time: ${order.responseTime}</pre>
<pre>    </pre>
<pre>Addons: ${order.AddonsMapped || '-'}</pre>
<pre>    </pre>
<pre>Assigned Helper: ${helperName}</pre>
<pre>    </pre>
<pre>Convenience: ${parseFloat(order.AppliedTaxAmount).toFixed(2)}</pre>
<pre>    </pre>
<pre>User Paid: ${parseFloat(order.ItemsAmount).toFixed(2)}</pre>
<pre>    </pre>
<pre>Helper Get: ${parseFloat(order.AmountHelperGet).toFixed(2)}</pre>
<pre>    </pre>
<pre>Sequence No: ${order.SequenceNo}</pre>
<pre>    </pre>
<pre>Total Discount: ${parseFloat(order.TotalDiscount).toFixed(2)}</pre>`;

      await db.raw('EXEC telegram_order_request ?', [msg]);
    }

    if (!data.RazorpayOrderid && data.walletfromamount === true) {
      const wallet = await db('UserWallet')
        .where({ UserMobileNo: data.OrderBy })
        .first();

      if (wallet) {
        const currentBlocked = parseFloat(wallet.UserBlockedAmount || '0');
        const currentBalance = parseFloat(wallet.UserAmountInWallet || '0');

        const newBlocked = currentBlocked + totalBlockAmount;
        let newBalance = currentBalance;

        if (parseFloat(data.walletbalance) > totalBlockAmount) {
          newBalance -= totalBlockAmount;
        } else {
          newBalance -= parseFloat(data.walletbalance || '0');
        }

        await db('UserWallet')
          .where({ UserMobileNo: data.OrderBy })
          .update({
            UserBlockedAmount: newBlocked.toFixed(2),
            UserAmountInWallet: newBalance.toFixed(2),
          });
      }
    } else if (data.RazorpayOrderid) {
      const transaction = await db('WalletTansaction')
        .where({ RazorpayOrderid: data.RazorpayOrderid, is_processed: 0 })
        .first();

      if (transaction) {
        const wallet = await db('UserWallet')
          .where({ UserMobileNo: data.OrderBy })
          .first();

        if (wallet) {
          const currentBlocked = parseFloat(wallet.UserBlockedAmount || '0');
          const currentBalance = parseFloat(wallet.UserAmountInWallet || '0');

          const newBlocked = currentBlocked + totalBlockAmount;
          let newBalance = currentBalance;

          if (transaction.walletfromamount && parseFloat(transaction.walletbalance) > totalBlockAmount) {
            newBalance -= totalBlockAmount;
          } else {
            newBalance -= parseFloat(transaction.walletbalance || '0');
          }

          await db('UserWallet')
            .where({ UserMobileNo: data.OrderBy })
            .update({
              UserBlockedAmount: newBlocked.toFixed(2),
              UserAmountInWallet: newBalance.toFixed(2),
            });

          await db('WalletTansaction')
            .where({ RazorpayOrderid: data.RazorpayOrderid })
            .update({ is_processed: 1 });
        }
      }
    }

    await db('WebhookLog').insert({
      Message: 'Updated booking payment success',
      Date: new Date(),
      PaymentStatus: data.RazorpayOrderid || 'WalletUsed',
      RazorpayOrderid: 'OrderController',
    });

    successResponse(res, 'Booking Order Register Successfully');
  } catch (error: any) {
    console.error('Error in updateBookingOrderPaysuccess:', error);
    await db('WebhookLog').insert({
      Message: error.message || String(error),
      Date: new Date(),
      PaymentStatus: 'UpdateBookingOrderPaysuccess',
      RazorpayOrderid: 'OrderController',
    });
    errorResponse(res, 'Booking payment update failed', 500);
  }
};

export const assignBookingOrders = async (req: Request, res: Response): Promise<void> => {
  const value = req.body;

  if (!value || !value.BookingId || !value.favouriteHelpers || !value.responseDates || !value.responseTime || !value.useraddress) {
    errorResponse(res, 'Missing required fields', 400);
    return;
  }

  const trx = await db.transaction();
  try {
    await trx('WebhookLog').insert({
      Message: 'come from webhook AssignBookingOrders',
      Date: new Date(),
      PaymentStatus: value.BookingId,
      RazorpayOrderid: value.BookingId,
    });

    const helper = await trx('ZufyHelper').where({ HelperMobileNo: value.favouriteHelpers }).first();
    const orderDetail = await trx('OrderBookingTable').where({ BookingId: value.BookingId }).first();

    if (!orderDetail || !helper) {
      await trx.rollback();
      return errorResponse(res, 'Order or helper not found', 404);
    }

    const userImage = await trx('ZufyUserData').where({ ContactNumber: orderDetail.OrderBy }).first();

    await trx('HelperAvailabiltyTracking').where({ BookingID: value.BookingId }).del();

    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    const status = 'Assigned';
    const currentTime = new Date();
    const expireTime = new Date(currentTime.getTime() + 30 * 60000);
    const expireSeconds = expireTime.getHours() * 3600 + expireTime.getMinutes() * 60 + expireTime.getSeconds();

    const orderItemTitles = await Promise.all(
      orderDetail.Itemsid.split(',').map(async (jobId: string) => {
        const job = await trx('JobsTable').where({ JobId: jobId }).first();
        return job?.JobTitle || '';
      })
    );

    const orderitemstring = orderItemTitles.join(',');

    const orderToHelper = {
      OrderId: orderDetail.BookingId,
      UserLat: orderDetail.OrderGenratedLat,
      UserLong: orderDetail.OrderGenratedLong,
      OrderBy: orderDetail.OrderBy,
      OrderSendedTo: value.favouriteHelpers,
      AppliedTaxOnOrder: orderDetail.AppliedTaxAmount,
      TotalAmountOrder: orderDetail.ItemTotalAmount,
      AmountHelperGet: orderDetail.AmountHelperGet,
      AmountHelperGetWithoutDiscount: orderDetail.AmountHelperGetWithoutDiscount,
      ItemsAmountWithoutDiscount: orderDetail.ItemsAmountWithoutDiscount,
      YufyConvWithoutDiscount: orderDetail.YufyConvWithoutDiscount,
      SequenceNo: orderDetail.SequenceNo,
      TotalDiscount: orderDetail.TotalDiscount,
      ConvenienceFee: orderDetail.ConvenienceFee,
      GstTax: orderDetail.GstTax,
      OrderAmount: orderDetail.AmountHelperGet,
      OrderStatus: status,
      OrderItem: orderDetail.Itemsid,
      HelperHouse: orderDetail.Housetype,
      UserName: orderDetail.UserName,
      UserImage: userImage?.Image || '',
      UserRequestTime: value.responseTime,
      UserRequestDate: value.responseDates,
      OrderExpire: expireSeconds.toString(),
      OrderCreatedMin: currentTime.getMinutes().toString(),
      VerficationOtp: otp,
      HelperCurrentRating: helper.HelperRating,
      HelperRatingCount: helper.RateGivenByUser,
      ClothItem: orderDetail.ClothItem,
      CookingPerson: orderDetail.CookingPerson,
      BathroomCount: orderDetail.BathroomCount,
      CookingPeriods: orderDetail.CookingPeriods,
      VegitableChopping: orderDetail.VegitableChopping,
      CookingItem: orderDetail.CookingItem,
      Loads: orderDetail.Loads,
      UserFeedbackUpdate: 'NotDone',
      HelperFeedbackUpdate: 'NotDone',
      TravelPoints: value.TravelPoints || '0',
      BookingTransaction: orderDetail.OrderItemId,
      UserLocation: value.useraddress,
      PermanentAddress: value.useraddress,
      OrderFrom: 'BookLater',
      AddonsMapped: orderDetail.AddonsMapped,
      MonthlyHelps: orderDetail.MonthlyHelps,
      RazorpayOrderid: orderDetail.RazorpayOrderid || '',
      RazorpayPaymentid: orderDetail.RazorpayPaymentid || '',
    };

    await trx('OrderToHelper').insert(orderToHelper);

    await trx('OrderBookingTable')
      .where({ BookingId: orderDetail.BookingId })
      .update({
        OrderTransaction: uuidv4(),
        responseTime: value.responseTime,
        responseDates: value.responseDates,
        OrderAcceptedBy: value.favouriteHelpers,
        useraddress: value.useraddress,
        OrderStatus: status,
      });

    await trx('ZufyUserData')
      .where({ ContactNumber: orderDetail.OrderBy })
      .update({ PermanentAddress: value.useraddress });

    await trx.commit();

    successResponse(res, 'Request Send To Helper');
  } catch (error: any) {
    await db('WebhookLog').insert({
      Message: error.message || String(error),
      Date: new Date(),
      PaymentStatus: 'AssignBookingOrdersError',
      RazorpayOrderid: 'OrderController',
    });

    console.error('AssignBookingOrders error:', error);
    errorResponse(res, 'Failed to assign booking order', 500);
  }
};

export const trackHelperAvailability = async (req: Request, res: Response): Promise<void> => {
  const data = req.body;

  if (!data || !data.BookingID || !data.HelperMobileNo || !data.HelperName || !data.BreakTime || !data.Duration || !data.BlockedDateTime || !data.ReleaseDateTime) {
    errorResponse(res, 'Missing required fields', 400);
    return;
  }

  const trx = await db.transaction();
  try {
    await trx('WebhookLog').insert({
      Message: 'come from webhook TrackHelperAvailabilty',
      Date: new Date(),
      PaymentStatus: data.BookingID,
      RazorpayOrderid: data.BookingID,
    });

    const order = await trx('OrderBookingTable').where({ BookingId: data.BookingID }).first();

    if (!order) {
      await trx.rollback();
      return errorResponse(res, 'Booking ID not found', 404);
    }

    await trx('HelperAvailabiltyTracking').where({ BookingID: data.BookingID }).del();

    await trx('HelperAvailabiltyTracking').insert({
      HelperMobileNo: data.HelperMobileNo,
      HelperName: data.HelperName,
      BookingID: data.BookingID,
      Duration: data.Duration,
      BlockedDateTime: data.BlockedDateTime,
      ReleaseDateTime: data.ReleaseDateTime,
      BreakTime: data.BreakTime,
      WorkStatus: 'Assigned',
      BlockStatus: 'Blocked',
      BlockReason: 'Work',
    });

    await trx.commit();
    successResponse(res, 'Helper availability updated with default values');
  } catch (error: any) {
    await trx.rollback();

    await db('WebhookLog').insert({
      Message: error.message || String(error),
      Date: new Date(),
      PaymentStatus: 'TrackHelperAvailability',
      RazorpayOrderid: 'OrderController',
    });

    console.error('trackHelperAvailability error:', error);
    errorResponse(res, 'Failed to insert helper availability', 500);
  }
};

export const getUpcomingBookingOrder = async (req: Request, res: Response): Promise<void> => {
  const { OrderBy } = req.body;

  if (!OrderBy) {
    errorResponse(res, 'OrderBy is required', 400);
    return;
  }

  try {
    const user = await db('ZufyUserData').where({ ContactNumber: OrderBy }).first();
    if (!user) {
      return successResponse(res, 'No user found', []);
    }

    const rawResult = await db.raw(`
      SELECT BookingId as OrderId, Itemsid, ISNULL(OrderAcceptedBy, '') as OrderSendedTo, OrderBy,
        OrderStatus, ItemTotalAmount as OrderAmount, responseDates as OrderDate, responseTime as OrderTime,
        '' as OrderFrom, ISNULL(AddonsMapped, '') as AddonsMapped, ISNULL(MonthlyHelps, 0) as MonthlyHelps, TotalDiscount
      FROM OrderBookingTable
      WHERE OrderBy = ? AND (OrderStatus IN ('Assigned', 'Accepted', 'Active'))
      ORDER BY CAST(CONCAT(SUBSTRING(responseDates, 4, 2), '-', SUBSTRING(responseDates, 1, 2), '-', SUBSTRING(responseDates, 7, 4), ' ', responseTime) AS NVARCHAR) ASC
    `, [OrderBy]);

    console.log('Raw Result:', rawResult);
    const rows = Array.isArray(rawResult[0])
      ? rawResult[0].filter(Boolean)
      : Array.isArray(rawResult)
        ? rawResult.filter(Boolean)
        : [];
    console.log('Filtered Rows:', rows);
    if (rows.length === 0) {
      return successResponse(res, 'No upcoming orders found', []);
    }

    const supportContact = await db('OfferSettings').where({ status: 'Support' }).first();
    const responseArray: any[] = [];

    for (const row of rows) {
      if (!row || !row.Itemsid) continue;

      const jobTitle = await getJobTitle(row.Itemsid);
      const AddonsCounts = checkAddonsCount(row.AddonsMapped);

      const orderData: any = {
        OrderId: row.OrderId,
        Jobtitile: jobTitle,
        OrderStatus: row.OrderStatus,
        OrderAmount: row.OrderAmount,
        OrderDate: row.OrderDate,
        OrderTime: row.OrderTime,
        addonscounts: AddonsCounts,
        SupportContact: supportContact?.supportedperson || '',
        MonthlyHelps: row.MonthlyHelps,
        TotalDiscount: row.TotalDiscount
      };

      if (row.OrderFrom === 'BookLater' || row.OrderFrom === '') {
        const helper = await db('ZufyHelper').where({ HelperMobileNo: row.OrderSendedTo }).first();
        if (helper) {
          orderData.HelperName = helper.HelperName;
          orderData.HelperImage = helper.HelperImage;
          orderData.Rating = helper.HelperRating;
          orderData.KycVerified = helper.KycVerified;
          orderData.VaccinationCount = helper.VaccineCount;
          orderData.RateGivenByUser = helper.RateGivenByUser;
        }
      } else {
        orderData.HelperName = 'Yet to be assigned';
        orderData.HelperImage = '';
        orderData.Rating = '';
        orderData.RateGivenByUser = '';
      }

      responseArray.push(orderData);
    }

    successResponse(res, 'Upcoming orders fetched', responseArray);
  } catch (err) {
    console.error('Error in UpcomingBookingOrder:', err);
    await db('WebhookLog').insert({
      Message: err instanceof Error ? err.message : String(err),
      Date: new Date(),
      PaymentStatus: 'UpcomingBookingOrder',
      RazorpayOrderid: 'HelperInfoController'
    });

    errorResponse(res, 'Internal server error', 500);
  }
};

// http://localhost:3000/api/order/allRequests
// {
//   "OrderBy": "8800391895",
//   "page": 1,
//   "limit": 10
// }
export const getAllUserRequests = async (req: Request, res: Response): Promise<void> => {
  const { OrderBy, page = 1, limit = 10 } = req.body;

  if (!OrderBy) {
    errorResponse(res, 'OrderBy is required', 400);
    return;
  }

  try {
    const offset = (page - 1) * limit;

    const [userExists, helperExists] = await Promise.all([
      db('ZufyUserData').where({ ContactNumber: OrderBy }).first(),
      db('ZufyHelper').where({ HelperMobileNo: OrderBy }).first()
    ]);

    if (!userExists && !helperExists) {
      return successResponse(res, 'No data found', { past: [], current: [], pending: [] });
    }

    const supportContact = await db('OfferSettings').where({ status: 'Support' }).first();
    const supportNumber = supportContact?.supportedperson ?? '';

    // ⏳ Past Orders (pagination enabled)
    const pastOrders = await db('OrderToHelper')
      .where(function () {
        this.where('OrderBy', OrderBy).orWhere('OrderSendedTo', OrderBy);
      })
      .whereIn('OrderStatus', ['Completed', 'Cancelled'])
      .offset(offset)
      .limit(limit)
      .orderBy('UserRequestDate', 'desc');

    // 🔄 Current Orders (Assigned / Accepted / Active)
    const currentOrders = await db('OrderToHelper')
      .where(function () {
        this.where('OrderBy', OrderBy).orWhere('OrderSendedTo', OrderBy);
      })
      .whereIn('OrderStatus', ['Accepted', 'Active', 'Assigned']);

    // 🧩 Format all three
    const formatOrders = async (orders: any[]) => {
      const results = [];

      for (const order of orders) {
        const jobTitle = await getJobTitle(order.OrderItem);
        const addonsCount = checkAddonsCount(order.AddonsMapped ?? '');

        const helper = await db('ZufyHelper')
          .where({ HelperMobileNo: order.OrderSendedTo })
          .first();

        const formatted = {
          OrderId: order.OrderId,
          HelperMobileNo: order.OrderSendedTo,
          HelperName: helper?.HelperName || 'Yet to be assigned',
          HelperImage: helper?.HelperImage || '',
          Jobtitile: jobTitle,
          addonscounts: addonsCount,
          OrderStatus: order.OrderStatus,
          OrderAmount: order.TotalAmountOrder || order.OrderAmount,
          UserRequestDate: `${order.UserRequestDate ?? ''} ${order.UserRequestTime ?? ''}`,
          Rating: helper?.HelperRating ?? '',
          RateGivenByUser: helper?.RateGivenByUser ?? '',
          SupportContact: supportNumber,
          Favourite: order.Favourite || false,
          OrderExpire: order.OrderExpire || null
        };

        results.push(formatted);
      }

      return results;
    };

    const [past, current] = await Promise.all([
      formatOrders(pastOrders),
      formatOrders(currentOrders),
    ]);

    successResponse(res, 'Fetched all user requests', { past, current });
  } catch (err) {
    console.error('Error in /user/allRequests:', err);
    await db('WebhookLog').insert({
      Message: err instanceof Error ? err.message : String(err),
      Date: new Date(),
      PaymentStatus: 'userRequestMerged',
      RazorpayOrderid: 'userRequestController'
    });

    errorResponse(res, 'Internal server error', 500);
  }
};

// {
//   "OrderBy": "8800391895",
//   "OrderId": "BOOK-1753338447430",
//   "OrderSendedTo": "9876543210"
// }
export const cancelPendingOrderByUser = async (req: Request, res: Response): Promise<void> => {
  const { OrderBy, OrderId, OrderSendedTo } = req.body;

  if (!OrderBy || !OrderId || !OrderSendedTo) {
    errorResponse(res, 'Missing required fields', 400);
    return;
  }

  try {
    const order = await db('OrderToHelper')
      .where({ OrderBy, OrderId, OrderSendedTo })
      .first();

    if (!order) {
      successResponse(res, 'NoPendingOrderIsPresent', null);
      return;
    }

    const now = new Date();
    const Helperdate = now.toLocaleDateString('en-GB'); // dd-MM-yyyy
    const Helpertime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }); // hh:mm AM/PM

    await db('OrderToHelper')
      .where({ OrderId })
      .update({
        OrderStatus: 'Pending Request Cancelled By User',
        UserRequestDate: Helperdate,
        UserRequestTime: Helpertime
      });

    successResponse(res, 'cancelPendingorderbyuser', null);
  } catch (err) {
    console.error('CancelPendingOrder Error:', err);
    await db('WebhookLog').insert({
      Message: err instanceof Error ? err.message : String(err),
      Date: new Date(),
      PaymentStatus: 'CancelPendingOrderByUser',
      RazorpayOrderid: 'HelperInfoController'
    });

    errorResponse(res, 'Something went wrong while cancelling order', 500);
  }
};


export const bookingFlowCombined = async (req: Request, res: Response): Promise<void> => {
  const data = req.body;

  if (!data || !data.OrderBy || !Array.isArray(data.responseDates) || !data.Itemsid) {
    errorResponse(res, 'Missing required fields', 400);
    return;
  }

  const trx = await db.transaction();
  try {
    console.log('🔁 Booking Flow Started');
    const lastTrans = await trx('OrderBookingTable').orderBy('TransactionNo', 'desc').first();
    const transactionNo = lastTrans ? lastTrans.TransactionNo + 1 : 1;
    console.log('✅ Transaction Number:', transactionNo);

    const user = await trx('ZufyUserData').where('ContactNumber', data.OrderBy).first();
    if (!user) throw new Error('User not found');

    const bookings = [];

    for (const entry of data.responseDates) {
      const bookingId = uuidv4();
      const jobDate = entry.job_date;
      const jobTime = entry.job_time;

      console.log(`📝 Creating Booking: ${bookingId} for ${jobDate} ${jobTime}`);

      await trx('OrderBookingTable').insert({
        BookingId: bookingId,
        Itemsid: data.Itemsid[0],
        OrderBy: data.OrderBy,
        UserName: entry.HelperName || data.UserName,
        responseDates: jobDate,
        responseTime: jobTime,
        ItemTotalAmount: parseFloat(data.ItemTotalAmount),
        ItemsAmount: parseFloat(data.ItemsAmount),
        ItemsAmountWithoutDiscount: parseFloat(data.ItemsAmountWithoutDiscount),
        AppliedTaxAmount: parseFloat(data.AppliedTaxAmount),
        ConvenienceFee: parseFloat(data.ConvenienceFee),
        YufyConvWithoutDiscount: parseFloat(data.YufyConvWithoutDiscount),
        AmountHelperGet: parseFloat(data.ItemsAmount) - parseFloat(data.AppliedTaxAmount),
        AmountHelperGetWithoutDiscount: parseFloat(data.ItemsAmountWithoutDiscount) - parseFloat(data.YufyConvWithoutDiscount),
        TotalDiscount: parseFloat(data.TotalDiscount),
        RazorpayOrderid: data.RazorpayOrderid,
        TransactionNo: transactionNo,
        OrderStatus: 'Pending',
        useraddress: data.useraddress,
        OrderGenratedLat: data.OrderGenratedLat,
        OrderGenratedLong: data.OrderGenratedLong,
        Gender: data.Gender,
        languages: data.languages,
        Housetype: data.Housetype,
        AddonsMapped: data.AddonsMapped,
        ClothItem: data.ClothItem,
        CookingPerson: data.CookingPerson,
        CookingPeriods: data.CookingPeriods,
        CookingItem: data.CookingItem,
        BathroomCount: data.BathroomCount,
        offerAmount: data.offerAmount,
        offerDays: data.offerDays,
        MonthlyHelps: data.MonthlyHelps || null,
        favouriteHelpers: JSON.stringify(data.favouriteHelpers),
      });

      bookings.push({
        bookingId,
        job_date: jobDate,
        job_time: jobTime,
        helperId: entry.HelperId,
        duration: entry.Duration
      });
    }

    console.log('🛠️ Updating user profile');
    await trx('ZufyUserData').where({ ContactNumber: data.OrderBy }).update({
      Languages: data.languages,
      Gender: data.Gender,
      PermanentAddress: data.useraddress,
    });

    console.log('💸 Inserting Wallet Transaction');
    await trx('WalletTansaction').insert({
      RazorpayOrderid: data.RazorpayOrderid,
      walletfromamount: parseFloat(data.walletfromamount),
      walletbalance: parseFloat(data.walletbalance),
      amounttobepaid: parseFloat(data.amounttobepaid),
      created_at: new Date(),
      is_processed: 0,
    });

    let totalBlockAmount = parseFloat(data.ItemTotalAmount);
    const wallet = await trx('UserWallet').where({ UserMobileNo: data.OrderBy }).first();
    if (!wallet) throw new Error('User wallet not found');

    console.log('🔐 Updating wallet balance & block');
    const currentBlocked = parseFloat(wallet.UserBlockedAmount || '0');
    const currentBalance = parseFloat(wallet.UserAmountInWallet || '0');
    const newBlocked = currentBlocked + totalBlockAmount;
    let newBalance = currentBalance;

    if (parseFloat(data.walletbalance) > totalBlockAmount) {
      newBalance -= totalBlockAmount;
    } else {
      newBalance -= parseFloat(data.walletbalance || '0');
    }

    await trx('UserWallet').where({ UserMobileNo: data.OrderBy }).update({
      UserBlockedAmount: newBlocked.toFixed(2),
      UserAmountInWallet: newBalance.toFixed(2),
    });

    for (const b of bookings) {
      console.log(`📦 Assigning Helper ${b.helperId} to Booking ${b.bookingId}`);
      const orderDetail = await trx('OrderBookingTable').where({ BookingId: b.bookingId }).first();
      const helper = await trx('ZufyHelper').where({ HelperMobileNo: b.helperId }).first();

      if (!orderDetail || !helper) {
        console.log(`⚠️ Skipping - Missing data for bookingId: ${b.bookingId}`);
        continue;
      }
      debugger

      const otp = Math.floor(1000 + Math.random() * 9000).toString();
      const currentTime = new Date();
      const expireTime = new Date(currentTime.getTime() + 30 * 60000);
      const expireSeconds = expireTime.getHours() * 3600 + expireTime.getMinutes() * 60 + expireTime.getSeconds();
      await trx('OrderToHelper').insert({
        OrderId: orderDetail.BookingId,
        OrderBy: orderDetail.OrderBy,
        OrderSendedTo: b.helperId,
        OrderStatus: 'Assigned',
        VerficationOtp: otp,
        OrderExpire: expireSeconds.toString(),
        UserLat: orderDetail.OrderGenratedLat,
        UserLong: orderDetail.OrderGenratedLong,
        UserRequestTime: b.job_time,
        UserRequestDate: b.job_date,
        UserName: orderDetail.UserName,
        OrderItem: orderDetail.Itemsid,
        AddonsMapped: orderDetail.AddonsMapped,
        TotalAmountOrder: orderDetail.ItemTotalAmount,
        AmountHelperGet: orderDetail.AmountHelperGet,
        HelperHouse: orderDetail.Housetype,
        PermanentAddress: orderDetail.useraddress,
        ConvenienceFee: orderDetail.ConvenienceFee,
        RazorpayOrderid: data.RazorpayOrderid,
        RazorpayPaymentid: data.RazorpayPaymentid || '',
      });
      debugger

      const jobDateTime = moment(`${b.job_date} ${b.job_time}`, 'YYYY-MM-DD hh:mm A');
      const durationMinutes = parseInt(b.duration || '60');

      // Add +5.5 hours to adjust for IST manually
      const istJobDateTime = moment(jobDateTime).add(5.5, 'hours');
      const releaseDateTime = moment(istJobDateTime).add(durationMinutes, 'minutes');
      const breakTime = moment(istJobDateTime).add(durationMinutes + 30, 'minutes');

      await trx('HelperAvailabiltyTracking').insert({
        HelperMobileNo: b.helperId,
        HelperName: orderDetail.UserName,
        BookingID: orderDetail.BookingId,
        Duration: durationMinutes,
        BlockedDateTime: istJobDateTime.toDate(),
        ReleaseDateTime: releaseDateTime.toDate(),
        BreakTime: breakTime.toDate(),
        WorkStatus: 'Assigned',
        BlockStatus: 'Blocked',
        BlockReason: 'Work',
      });

      // const telegramMsg = `✅ New Booking Assigned\nBooking Id: ${orderDetail.BookingId}\nName: ${orderDetail.UserName}\nMobile: ${orderDetail.OrderBy}\nTime: ${b.job_time} on ${b.job_date}\nHelper: ${helper.HelperName}`;
      // await trx.raw('EXEC telegram_order_request ?', [telegramMsg]);

      await trx('OrderBookingTable')
        .where({ BookingId: orderDetail.BookingId })
        .update({
          OrderTransaction: transactionNo,
          OrderAcceptedBy: b.helperId,
          OrderStatus: 'Assigned',
          responseTime: b.job_time,
          responseDates: b.job_date,
          useraddress: orderDetail.useraddress,

        });
    }

    await trx.commit();
    console.log('✅ Booking Flow Completed');

    successResponse(res, 'Booking, payment, assignment, and availability tracking completed', {
      transactionNo,
      bookings,
    });
  } catch (error: any) {
    await trx.rollback();
    console.error('❌ bookingFlowCombined error:', error);

    await db('WebhookLog').insert({
      Message: (error.message || String(error)).substring(0, 500),
      Date: new Date(),
      PaymentStatus: 'BookingFlowCombinedError',
      RazorpayOrderid: data.RazorpayOrderid || 'NA',
    });

    errorResponse(res, 'Booking failed: ' + error.message, 500);
  }
};