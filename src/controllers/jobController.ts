import { Request, Response } from 'express';
import db from '../config/db';
import { errorResponse, successResponse } from '../utilities/responseWrapper';
import dayjs from 'dayjs';
import moment from 'moment';
import { getGeneralSetting, getTerms, timeStringToMinutes } from '../utilities/commonMethords';

interface Rate {
  HouseSize: string;
}
export interface HelperWithSlot {
  HelperMobileNo: string;
  HelperName: string;
  HelperLanguageSpeak: string;
  HelperImage: string;
  KycVerified: number;
  availableTimings: {
    returnValue: string;
    suggested_t1: string;
    suggested_t2: string;
  };
  HelperRating: number;
  userOrderCount: number;
}
export interface ZufyHelper {
  HelperMobileNo: string;
  HelperName: string;
  HelperLanguageSpeak: string;
  HelperImage: string;
  KycVerified: number;
  HelperCurrentLat?: number | null;
  HelperCurrentLong?: number | null;
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
        JobImage: "job.JobImage",
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


function getTimeAsMinutes(time: string): number {
  const [hour, minute] = time.split(':').map(Number);
  return isNaN(hour) || isNaN(minute) ? NaN : hour * 60 + minute;
}

function convertMinutesToTime(mins: number): string {
  if (isNaN(mins)) return 'NA';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
}

function checkAvailableTime(
  blocked: { st: number; end: number }[],
  selectedMins: number,
  jobDuration: number
): {
  returnValue: string;
  suggested_t1: string;
  suggested_t2: string;
} {
  if (isNaN(selectedMins)) {
    return {
      returnValue: 'NA',
      suggested_t1: 'NA',
      suggested_t2: 'NA',
    };
  }

  let isAvailable = true;

  for (const { st, end } of blocked) {
    if (
      (selectedMins >= st && selectedMins < end) ||
      (selectedMins + jobDuration > st && selectedMins + jobDuration <= end)
    ) {
      isAvailable = false;
      break;
    }
  }

  if (isAvailable) {
    return {
      returnValue: convertMinutesToTime(selectedMins),
      suggested_t1: 'NA',
      suggested_t2: 'NA',
    };
  } else {
    const t1 = selectedMins - jobDuration >= 420 ? selectedMins - jobDuration : null;
    const t2 = selectedMins + jobDuration <= 1200 ? selectedMins + jobDuration : null;
    return {
      returnValue: 'NA',
      suggested_t1: t1 ? convertMinutesToTime(t1) : 'NA',
      suggested_t2: t2 ? convertMinutesToTime(t2) : 'NA',
    };
  }
}

export const getSuggestedHelpers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { Mobilenos, UserMobile, date, requestedStartTime, jobDuration } = req.body;

    // ✅ Convert DD-MM-YYYY to YYYY-MM-DD for SQL query
    const sqlDate = moment(date, 'DD-MM-YYYY').format('YYYY-MM-DD');
    const mobileNosArr = Mobilenos.split(',');

    const activeHelpersRaw = await db('ZufyHelper')
      .whereIn('HelperMobileNo', mobileNosArr)
      .andWhere({ HelperStatus: 'Active' });

    const activeHelpers = mobileNosArr
      .map((mobile: string) =>
        activeHelpersRaw.find((helper: any) => helper.HelperMobileNo === mobile)
      )
      .filter(Boolean);

    const results = [];

    // ✅ Ensure time is parsed from both 12-hr and 24-hr
    const time24 = moment(requestedStartTime, ['hh:mm A', 'HH:mm']).format('HH:mm');
    const selectedMins = getTimeAsMinutes(time24);

    for (const helper of activeHelpers) {
      const helperMobile = helper.HelperMobileNo;

      const tracking = await db('HelperAvailabiltyTracking')
        .whereRaw('CAST(BlockedDateTime AS DATE) = ?', [sqlDate])
        .andWhere({ HelperMobileNo: helperMobile });

      const blocked = tracking.map((record: any) => {
        const start = new Date(record.BlockedDateTime);
        const end = new Date(record.ReleaseDateTime);
        return {
          st: start.getHours() * 60 + start.getMinutes(),
          end: end.getHours() * 60 + end.getMinutes(),
        };
      });

      const availableTimings = checkAvailableTime(blocked, selectedMins, jobDuration);

      const userOrderCount = await db('OrderToHelper')
        .where({
          OrderSendedTo: helperMobile,
          OrderBy: UserMobile,
          OrderStatus: 'Completed',
        })
        .count('* as count')
        .first();

      const avgRatingRow = await db('OrderToHelper')
        .where({ OrderSendedTo: helperMobile, RatingFlag: 1 })
        .avg({
          avg: db.raw(
            '((ISNULL(WorkRating, 0) + ISNULL(BehaviourRating, 0) + ISNULL(PunctualityRating, 0))/3.0)'
          ),
        })
        .first();

      results.push({
        HelperMobileNo: helper.HelperMobileNo,
        HelperName: helper.HelperName,
        HelperLanguageSpeak: helper.HelperLanguageSpeak,
        HelperImage: "helper.HelperImage",
        KycVerified: helper.KycVerified,
        HelperRating: Number(avgRatingRow?.avg?.toFixed(1)) || 0,
        userOrderCount: Number(userOrderCount?.count) || 0,
        availableTimings,
      });
    }

    successResponse(res, 'Suggested helpers fetched successfully.', results);
  } catch (error) {
    console.error('❌ getSuggestedHelpers Error:', error);
    errorResponse(res, 'Failed to fetch suggested helpers', 500, 'Internal Server Error');
  }
};