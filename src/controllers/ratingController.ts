import db from "../config/db";
import { checkAndGetAddonsCount, getJobImage, getJobTitle } from "../utilities/commonMethords";
import { errorResponse, successResponse } from "../utilities/responseWrapper";
import { Request, Response } from "express";

export const checkHelperFeedback = async (req: Request, res: Response): Promise<void> => {
  const { OrderBy } = req.body 

  if (!OrderBy) {
    errorResponse(res, 'OrderBy is required', 400);
    return;
  }

  try {
    const order = await db('OrderToHelper')
      .where({
        OrderBy,
        OrderStatus: 'Completed',
        HelperFeedbackUpdate: 'NotDone'
      })
      .andWhere(function () {
        this.whereNull('RatingFlag').orWhereNot('RatingFlag', 1);
      })
      .first();

    if (!order) {
      successResponse(res, 'No feedback pending', []);
      return;
    }

    const jobImage = await getJobImage(order.OrderItem);
    const jobTitle = await getJobTitle(order.OrderItem);
    const addonsCount = checkAndGetAddonsCount(order.AddonsMapped ?? '');
    const favCheck = await db('FavouriteHelper')
      .where({
        FavouriteTo: order.OrderSendedTo,
        FavouriteBy: OrderBy,
      })
      .first();

    const responseObj = {
      OrderId: order.OrderId,
      OrderSendedTo: order.OrderSendedTo,
      UserName: order.UserName,
      UserImage: order.UserImage,
      OrderAmount: order.OrderAmount,
      OrderStatus: order.OrderStatus,
      OrderBy: order.OrderBy,
      Image: jobImage,
      Title: jobTitle,
      HelperName: order.HelperName,
      Ratestatus: order.HelperFeedbackUpdate,
      addonscounts: addonsCount,
      favourtie: favCheck ? 'true' : 'false',
    };

    successResponse(res, 'Feedback check result', [responseObj]);
  } catch (err) {
    console.error('Error in checkHelperFeedback:', err);
    await db('WebhookLog').insert({
      Message: err instanceof Error ? err.message : String(err),
      Date: new Date(),
      PaymentStatus: 'CheckHelperFeedback',
      RazorpayOrderid: 'FeedbackController'
    });

    errorResponse(res, 'Internal server error', 500);
  }
};

export const updateHelperRating = async (req: Request, res: Response): Promise<void> => {
  const {
    HelperNo,
    UserNo,
    OrderId,
    WorkRating,
    PunctualityRating,
    BehaviourRating,
    Feedback,
    IsFavourite
  } = req.body;

  if (!HelperNo || !UserNo || !OrderId) {
    errorResponse(res, 'Missing required fields', 400);
    return;
  }

  const trx = await db.transaction();

  try {
    const helper = await trx('ZufyHelper').where({ HelperMobileNo: HelperNo }).first();

    if (!helper) {
      await trx.rollback();
      errorResponse(res, 'Helper not found', 404);
      return;
    }

    const order = await trx('OrderToHelper')
      .where({ OrderSendedTo: HelperNo, OrderId })
      .first();

    if (!order) {
      await trx.rollback();
      errorResponse(res, 'Order not found', 404);
      return;
    }

    // Update OrderToHelper feedback details
    await trx('OrderToHelper')
      .where({ OrderSendedTo: HelperNo, OrderId })
      .update({
        OrderStatus: order.OrderStatus !== 'Completed' ? 'Completed' : order.OrderStatus,
        HelperFeedbackUpdate: 'Done',
        WorkRating,
        PunctualityRating,
        BehaviourRating,
        Feedback,
        RatingFlag: 1,
        RatingOn: new Date(),
      });

    // Handle FavouriteHelper logic
    if (parseInt(IsFavourite) === 1) {
      const existingFav = await trx('FavouriteHelper')
        .where({
          FavouriteTo: HelperNo,
          FavouriteBy: UserNo,
        })
        .first();

      if (existingFav) {
        await trx('FavouriteHelper')
          .where({
            FavouriteTo: HelperNo,
            FavouriteBy: UserNo,
          })
          .update({
            FavouriteDate: new Date(),
          });
      } else {
        await trx('FavouriteHelper').insert({
          FavouriteTo: HelperNo,
          FavouriteBy: UserNo,
          FavouriteDate: new Date(),
        });
      }
    }

    await trx.commit();
    successResponse(res, 'Rating Updated');
  } catch (err) {
    await trx.rollback();

    await db('WebhookLog').insert({
      Message: err instanceof Error ? err.message : String(err),
      Date: new Date(),
      PaymentStatus: 'UpdateHelperRating',
      RazorpayOrderid: 'FeedbackController',
    });

    console.error('❌ updateHelperRating error:', err);
    errorResponse(res, 'Internal server error', 500);
  }
};