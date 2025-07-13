import { Request, Response } from 'express';
import db from '../config/db';
import { errorResponse, successResponse } from '../utilities/responseWrapper';
import dayjs from 'dayjs';
import { getGeneralSetting, getTerms, timeStringToMinutes } from '../utilities/commonMethords';

interface Rate {
  HouseSize: string;
}

export const getJobListsOrder = async (req: Request, res: Response): Promise<void> => {
  const { HouseSize }: Rate = req.body;
  console.log('📥 Received request to get job lists with HouseSize:', HouseSize);

  if (!HouseSize) {
    errorResponse(res, 'HouseSize is required', 400);
    return;
  }

  try {
    const allJobIds = await db('TariffPlan').select('JobId')
      .union([
        db('ClothesTraffPlan').select('JobId'),
        db('CookingTariffPlan').select('JobId')
      ]);

    const tariffPlansData = await db('TariffPlan');
    const jobsResult: any[] = [];

    for (const { JobId } of allJobIds) {
      const cleanJobId = typeof JobId === 'number' ? JobId.toString() : JobId?.toString().replace('.0', '');

      if (['4009', '4010'].includes(cleanJobId)) continue;

      const job = await db('JobsTable')
        .where({ JobId: cleanJobId, JobFlag: 1 })
        .first();

      if (!job) continue;

      const jobData: any = {
        JobsId: job.JobId,
        Jobs: job.Jobs,
        JobTitle: job.JobTitle,
        JobImage: job.JobImage,
        Description: job.Description,
        TypeOfJob: job.TypeOfJob,
        Orderjobs: job.JobOrder,
        Jobcomment1: job.Comment1,
        Jobcomment2: job.Comment2,
        Jobcomment3: job.Comment3,
      };

      const mainTariff = tariffPlansData.find(t => t.JobId.toString().replace('.0', '') === job.JobId);
      if (mainTariff) {
        jobData.MainC1BhkDuration = mainTariff.C1BhkDuration ?? '0';
        jobData.MainC2BhkDuration = mainTariff.C2BhkDuration ?? '0';
        jobData.MainC3BhkDuration = mainTariff.C3BhkDuration ?? '0';
        jobData.MainC3_BhkDuration = mainTariff['3+BhkDuration'] ?? '0';
        jobData.MainVillaDuration = mainTariff.VillaDuration ?? '0';
        jobData.MainIndividualJobDuration = mainTariff.IndividualJobDuration ?? '0';
      }

      if (job.Addons_Mapping) {
        const addonIds = job.Addons_Mapping.split(',');
        jobData.AddonsMapping = [];

        for (const aid of addonIds) {
          const addonJob = await db('JobsTable').where({ JobId: aid }).first();
          const addonTariff = tariffPlansData.find(t => t.JobId.toString().replace('.0', '') === aid);
          if (!addonJob || !addonTariff) continue;

          const addon: any = {
            AddonId: aid,
            JobTitle: addonJob.JobTitle,
            TypeOfJob: addonJob.TypeOfJob,
            MinVal: addonTariff.Minval ?? '0',
            MaxVal: addonTariff.Maxval ?? '0',
          };

          const sizeMap: Record<string, [string, string, string, string]> = {
            '1Bhk': ['C1Bhk', '1CF', '1DCF', '1BhkDuration'],
            '2Bhk': ['C2Bhk', '2CF', '2DCF', '2BhkDuration'],
            '3Bhk': ['C3Bhk', '3CF', '3DCF', '3BhkDuration'],
            '4Bhk': ['4Bhk', '4CF', '4DCF', '3+BhkDuration'],
            'Villa': ['Villa', 'VillaCF', 'VillaDCF', 'VillaDuration'],
          };

          if (addonJob.HouseFlag === 1 && ['Single', 'Bundle'].includes(addonJob.TypeOfJob)) {
            const [price, cf, dcf, dur] = sizeMap[HouseSize] ?? [];
            addon.Price = addonTariff[price] ?? '0';
            addon.ConvenienceFee = addonTariff[cf] ?? '0';
            addon.DiscountConvenienceFee = addonTariff[dcf] ?? '0';
            addon.Duration = addonTariff[dur] ?? '0';
          } else {
            addon.Price = addonTariff.Price ?? '0';
            addon.Duration = addonTariff.IndividualJobDuration ?? '0';
            addon.ConvenienceFee = addonTariff.CF ?? '0';
            addon.DiscountConvenienceFee = addonTariff.DCF ?? '0';
          }

          jobData.AddonsMapping.push(addon);
        }
      }

      const matchedTariffs = tariffPlansData.filter(t => t.JobId.toString().replace('.0', '') === job.JobId);
      for (const t of matchedTariffs) {
        const applyPricing = (p: string, cf: string, dcf: string, dur: string) => {
          jobData.Price = t[p] ?? '0';
          jobData.ConvenienceFee = t[cf] ?? '0';
          jobData.DiscountConvenienceFee = t[dcf] ?? '0';
          jobData.Duration = t[dur] ?? '0';
        };

        if (['Single', 'Bundle'].includes(job.TypeOfJob)) {
          if (job.HouseFlag === 1) {
            const sizeMap: Record<string, [string, string, string, string]> = {
              '1Bhk': ['C1Bhk', '1CF', '1DCF', '1BhkDuration'],
              '2Bhk': ['C2Bhk', '2CF', '2DCF', '2BhkDuration'],
              '3Bhk': ['C3Bhk', '3CF', '3DCF', '3BhkDuration'],
              '4Bhk': ['4Bhk', '4CF', '4DCF', '3+BhkDuration'],
              'Villa': ['Villa', 'VillaCF', 'VillaDCF', 'VillaDuration'],
            };
            const [p, cf, dcf, dur] = sizeMap[HouseSize] ?? [];
            applyPricing(p, cf, dcf, dur);
          } else {
            jobData.Price = t.Price ?? '0';
            jobData.ConvenienceFee = t.CF ?? '0';
            jobData.DiscountConvenienceFee = t.DCF ?? '0';
            jobData.Duration = t.IndividualJobDuration ?? '0';
          }
        } else if (job.TypeOfJob === 'Clothes') {
          const clothes = await db('ClothesTraffPlan').where({ JobId: job.JobId }).first();
          if (clothes) {
            Object.assign(jobData, {
              Price: clothes.Price ?? '0',
              Duration: clothes.Duration ?? '0',
              ConvenienceFee: clothes.CF ?? '0',
              DiscountConvenienceFee: clothes.DCF ?? '0',
            });
          }
        } else if (job.TypeOfJob === 'Cooking') {
          const cooking = await db('CookingTariffPlan').where({ JobId: job.JobId }).first();
          if (cooking) {
            Object.assign(jobData, {
              Price: cooking.Price ?? '0',
              Duration: cooking.Duration ?? '0',
              ConvenienceFee: cooking.CF ?? '0',
              DiscountConvenienceFee: cooking.DCF ?? '0',
            });
          }
        }
      }

      jobsResult.push(jobData);
    }

    const hourlyKeywords = ['hour', 'pack', 'duo', 'child care'];
    const serviceKeywords = ['3 in one', 'cleaning', 'dishwashing', 'sparkling'];

    const categorized = {
      Hourly: jobsResult.filter(j => hourlyKeywords.some(k => j.JobTitle?.toLowerCase().includes(k))),
      ServiceBased: jobsResult.filter(j => serviceKeywords.some(k => j.JobTitle?.toLowerCase().includes(k))),
    };

    successResponse(res, 'Jobs fetched successfully', categorized);
  } catch (err) {
    console.error('Error fetching job list:', err);
    errorResponse(res, 'Internal Server Error', 500);
  }
};


export const getSuggestedHelpers = async (req: Request, res: Response): Promise<void> => {
  const { Mobilenos, UserMobile } = req.body;

  if (!Mobilenos || !UserMobile) {
    errorResponse(res, 'Mobilenos and UserMobile are required', 400);
    return;
  }

  try {
    const mobileNosArr = Mobilenos.split(',');

    const activeHelpers = await db('ZufyHelper')
      .whereIn('HelperMobileNo', mobileNosArr)
      .andWhere('HelperStatus', 'Active');
    console.log("activeHelpers", activeHelpers)
    activeHelpers.sort((a, b) => mobileNosArr.indexOf(a.HelperMobileNo) - mobileNosArr.indexOf(b.HelperMobileNo));

    const results = [];

    for (const helper of activeHelpers) {
      if (!helper.HelperCurrentLat && !helper.HelperCurrentLong) continue;

      const helperMobile = helper.HelperMobileNo;

      const checkBlocked = await db('BlockedHelper')
        .where(function () {
          this.where({ BlockedTo: helperMobile, BlockedBy: UserMobile })
            .orWhere({ BlockedBy: helperMobile, BlockedTo: UserMobile });
        });

      const blockedUserCountRaw = await db.raw(
        `SELECT COUNT(*) as count FROM ref_Blockuser WHERE user_mobile = ? AND helper_mobile = ?`,
        [UserMobile, helperMobile]
      );
      const checkUserBlockedCount = blockedUserCountRaw[0]?.[0]?.count || 0;

      if (checkBlocked.length > 0 || checkUserBlockedCount > 0) continue;

      const ratingData = await db('OrderToHelper')
        .select(
          db.raw(`
            ROUND(
              (AVG(COALESCE(WorkRating, 0)) + AVG(COALESCE(BehaviourRating, 0)) + AVG(COALESCE(PunctualityRating, 0))) / 3, 2
            ) as totalavg
          `)
        )
        .where({ OrderSendedTo: helperMobile, RatingFlag: 1 })
        .first();

      const totalAverageValue = ratingData?.totalavg || 0;

      const [totalOrderCount, userOrderCount, totalFavCount, userFavCount] = await Promise.all([
        db('OrderToHelper').count('* as count').where({ OrderSendedTo: helperMobile, OrderStatus: 'Completed' }).first(),
        db('OrderToHelper').count('* as count').where({ OrderSendedTo: helperMobile, OrderStatus: 'Completed', OrderBy: UserMobile }).first(),
        db('FavouriteHelper').count('* as count').where({ FavouriteTo: helperMobile }).first(),
        db('FavouriteHelper').count('* as count').where({ FavouriteTo: helperMobile, FavouriteBy: UserMobile }).first()
      ]);

      const [BreakHours, IdleHours, ForceIdleHours] = await Promise.all([
        getGeneralSetting('BreakHours'),
        getGeneralSetting('IdleHours'),
        getGeneralSetting('ForceIdleHours')
      ]);

      const UserTerms = await getTerms('UserTerms');

      results.push({
        HelperMobileNo: helper.HelperMobileNo,
        HelperName: helper.HelperName,
        HelperLanguageSpeak: helper.HelperLanguageSpeak,
        HelperImage: helper.HelperImage,
        KycVerified: helper.KycVerified,
        HelperRating: parseFloat(totalAverageValue.toFixed(1)),
        totalOrderCount: totalOrderCount?.count ?? 0,
        userOrderCount: userOrderCount?.count ?? 0,
        totalFavCount: totalFavCount?.count ?? 0,
        userFavCount: userFavCount?.count ?? 0,
        BreakHours,
        IdleHours,
        ForceIdleHours,
        UserTerms
      });
    }

    successResponse(res, 'Suggested helpers fetched successfully', results);
  } catch (error) {
    console.error('Error in getSuggestedHelpers:', error);
    await db('WebhookLog').insert({
      Message: (error instanceof Error ? error.toString() : String(error)),
      Date: new Date(),
      PaymentStatus: 'getSuggestedHelpers',
      RazorpayOrderid: 'UserRequestController'
    });
    errorResponse(res, 'Internal server error', 500);
  }
};

export const getHelperAvailabilityDetails = async (req: Request, res: Response): Promise<void> => {
  const { HelperNumbers, RequestDates } = req.body;

  if (!HelperNumbers || !RequestDates) {
    errorResponse(res, 'HelperNumbers and RequestDates are required', 400);
    return;
  }

  try {
    const HelperNumbersArr = HelperNumbers.split(',');
    const RequestDatesArr: string[] = RequestDates.split(',').map((date: string) => date.trim());

    const records = await db('HelperAvailabiltyTracking')
      .select('*')
      .whereIn('HelperMobileNo', HelperNumbersArr);

    const filtered = records.filter(row => {
      const blockedDate = row.BlockedDateTime
        ? dayjs(row.BlockedDateTime).format('DD-MM-YYYY')
        : '';
      return RequestDatesArr.includes(blockedDate);
    });

    console.log("filtered", filtered)

    const result = filtered.map(a => ({
      autonum: a.autonum,
      HelperMobileNo: a.HelperMobileNo,
      HelperName: a.HelperName,
      BookingID: a.BookingID,
      BlockedDateTime: a.BlockedDateTime,
      ReleaseDateTime: a.ReleaseDateTime,
      Duration: a.Duration,
      BlockReason: a.BlockReason,
      WorkStatus: a.WorkStatus,
      BlockStatus: a.BlockStatus,
      BreakTime: a.BreakTime,
      BlockedDate: a.BlockedDateTime ? dayjs(a.BlockedDateTime).format('DD-MM-YYYY') : '',
      ReleaseDate: a.ReleaseDateTime ? dayjs(a.ReleaseDateTime).format('DD-MM-YYYY') : '',
      BlockedTime: a.BlockedDateTime ? dayjs(a.BlockedDateTime).format('HH:mm') : '',
      ReleaseTime: a.ReleaseDateTime ? dayjs(a.ReleaseDateTime).format('HH:mm') : '',
      BreakTimeFormatted: a.BreakTime ? dayjs(a.BreakTime).format('HH:mm') : ''
    }));

    successResponse(res, 'Helper availability details fetched successfully', result);
  } catch (error) {
    console.error('Error in getHelperAvailabilityDetails:', error);
    errorResponse(res, 'Internal server error', 500);
  }
};

export const getAllGeneralSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const settings = await db('GeneralSettings').select('*');
    successResponse(res, 'All general settings fetched successfully', settings);
  } catch (error) {
    console.error('Error in getAllGeneralSettings:', error);
    await db('WebhookLog').insert({
      Message: (error instanceof Error ? error.toString() : String(error)),
      Date: new Date(),
      PaymentStatus: 'GetAllGeneralSettings',
      RazorpayOrderid: 'UserRequestController'
    });
    errorResponse(res, 'Internal server error', 500);
  }
};

export const getTermsAPI = async (req: Request, res: Response): Promise<void> => {
  const { data } = req.body;

  if (!data) {
    errorResponse(res, 'data (title) is required', 400);
    return;
  }

  try {
    const terms = await db('GeneralSettings').where({ title: data }).select('*');
    successResponse(res, 'Terms fetched successfully', terms);
  } catch (error) {
    console.error('Error in getTermsAPI:', error);
    errorResponse(res, 'Internal server error', 500);
  }
};

const getAvailableTimings = (
  allocated: { st: number; end: number }[],
  reqTime: number,
  duration: number,
  breakTime: number,
  min_time: number,
  max_time: number
): string[] => {
  const result: string[] = [];
  const totalRequired = duration + breakTime;
  allocated.sort((a, b) => a.st - b.st);
  allocated.push({ st: max_time + 1, end: max_time + 1 });

  let current = Math.max(reqTime, min_time);

  for (const slot of allocated) {
    if (slot.st - current >= totalRequired) {
      const hours = Math.floor(current / 60);
      const minutes = current % 60;
      result.push(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
    }
    current = Math.max(current, slot.end);
  }

  return result;
};

export const getHelpersWithAvailableSlots = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      Mobilenos,
      UserMobile,
      date,
      jobDuration,
      breakMinutes,
      requestedStartTime,
    } = req.body;

    if (!Mobilenos || !UserMobile || !date || !jobDuration || !requestedStartTime) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const mobileNosArr = Mobilenos.split(',').map((m: string) => m.trim());

    const now = dayjs();
    const today = now.format('DD-MM-YYYY');
    const currentMins = now.hour() * 60 + now.minute();
    const reqTime = dayjs(`${date} ${requestedStartTime}`, 'DD-MM-YYYY hh:mm A');
    const reqMins = reqTime.hour() * 60 + reqTime.minute();

    if (date === today && reqMins < currentMins) {
      res.status(400).json({ error: 'Requested start time is in the past.' });
      return;
    }

    const activeHelpers = await db('ZufyHelper')
      .whereIn('HelperMobileNo', mobileNosArr)
      .andWhere('HelperStatus', 'Active');

    activeHelpers.sort(
      (a, b) => mobileNosArr.indexOf(a.HelperMobileNo) - mobileNosArr.indexOf(b.HelperMobileNo)
    );

    const breakTimeMins =
      typeof breakMinutes === 'number'
        ? breakMinutes
        : await getGeneralSetting('BreakHours');

    const availRecords = await db('HelperAvailabiltyTracking')
      .select('*')
      .whereIn('HelperMobileNo', mobileNosArr);

    const filteredRecords = availRecords.filter((row) => {
      const blockedDate = row.BlockedDateTime
        ? dayjs(row.BlockedDateTime).format('DD-MM-YYYY')
        : '';
      return blockedDate === date;
    });

    const min_time = 360;
    const max_time = 1080;
    const results = [];

    for (const helper of activeHelpers) {
      const helperMobile = helper.HelperMobileNo;

      const helperRecords = filteredRecords.filter(
        (r) => r.HelperMobileNo === helperMobile
      );

      const allocated_hours = helperRecords.map((r) => {
        const st = timeStringToMinutes(dayjs(r.BlockedDateTime).format('HH:mm'));
        const end = r.BreakTime
          ? timeStringToMinutes(dayjs(r.BreakTime).format('HH:mm'))
          : st + 30; // Fallback to 30 min slot
        return { st, end };
      });

      const availableTimings = getAvailableTimings(
        allocated_hours,
        reqMins,
        parseInt(jobDuration, 10),
        breakTimeMins,
        min_time,
        max_time
      );

      const ratingData = await db('OrderToHelper')
        .select(
          db.raw(`
            ROUND(
              (AVG(COALESCE(WorkRating, 0)) + AVG(COALESCE(BehaviourRating, 0)) + AVG(COALESCE(PunctualityRating, 0))) / 3, 2
            ) as totalavg
          `)
        )
        .where({ OrderSendedTo: helperMobile, RatingFlag: 1 })
        .first();

      const totalAverageValue = ratingData?.totalavg || 0;

      const [totalOrderCount, userOrderCount] = await Promise.all([
        db('OrderToHelper').count('* as count')
          .where({ OrderSendedTo: helperMobile, OrderStatus: 'Completed' })
          .first(),

        db('OrderToHelper').count('* as count')
          .where({
            OrderSendedTo: helperMobile,
            OrderStatus: 'Completed',
            OrderBy: UserMobile
          })
          .first()
      ]);

      results.push({
        HelperMobileNo: helperMobile,
        HelperName: helper.HelperName,
        HelperLanguageSpeak: helper.HelperLanguageSpeak,
        HelperImage: helper.HelperImage,
        KycVerified: helper.KycVerified,
        availableTimings,
        HelperRating: totalAverageValue,
        userOrderCount: userOrderCount?.count ?? 0,
      });
    }

    res.json({
      message: 'Helpers with available slots fetched successfully',
      results
    });
  } catch (error) {
    console.error('Error in getHelpersWithAvailableSlots:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

