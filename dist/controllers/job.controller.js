"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getJobListsOrder = void 0;
const db_1 = __importDefault(require("../config/db"));
const responseWrapper_1 = require("../utilities/responseWrapper");
const getJobListsOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { HouseSize } = req.body;
    debugger;
    if (!HouseSize) {
        (0, responseWrapper_1.errorResponse)(res, 'HouseSize is required', 400);
        return;
    }
    try {
        const jobIds = yield (0, db_1.default)('TariffPlans').select('JobId')
            .union([
            (0, db_1.default)('ClothesTraffPlans').select('JobId'),
            (0, db_1.default)('CookingTariffPlans').select('JobId'),
        ]);
        const tariffPlansData = yield (0, db_1.default)('TariffPlans');
        const jobsResult = [];
        for (const job of jobIds) {
            const jobs = yield (0, db_1.default)('JobsTables')
                .where({ JobId: job.JobId, JobFlag: 1 })
                .whereNotIn('JobId', ['4009', '4010']);
            for (const j of jobs) {
                const jobData = {
                    JobsId: j.JobId,
                    Jobs: j.Jobs,
                    JobTitle: j.JobTitle,
                    JobImage: j.JobImage,
                    Description: j.Description,
                    TypeOfJob: j.TypeOfJob,
                    Orderjobs: j.JobOrder,
                    Jobcomment1: j.Comment1,
                    Jobcomment2: j.Comment2,
                    Jobcomment3: j.Comment3,
                };
                const mainTariff = tariffPlansData.find(t => t.JobId === j.JobId);
                const getDurations = (tariff) => {
                    jobData.MainC1BhkDuration = (tariff === null || tariff === void 0 ? void 0 : tariff.C1BhkDuration) || '0';
                    jobData.MainC2BhkDuration = (tariff === null || tariff === void 0 ? void 0 : tariff.C2BhkDuration) || '0';
                    jobData.MainC3BhkDuration = (tariff === null || tariff === void 0 ? void 0 : tariff.C3BhkDuration) || '0';
                    jobData.MainC3_BhkDuration = (tariff === null || tariff === void 0 ? void 0 : tariff.C3_BhkDuration) || '0';
                    jobData.MainVillaDuration = (tariff === null || tariff === void 0 ? void 0 : tariff.VillaDuration) || '0';
                    jobData.MainIndividualJobDuration = (tariff === null || tariff === void 0 ? void 0 : tariff.IndividualJobDuration) || '0';
                };
                getDurations(mainTariff);
                // Addons
                if (j.Addons_Mapping) {
                    const addonIds = j.Addons_Mapping.split(',');
                    const addonArray = [];
                    for (const aid of addonIds) {
                        const addonJob = yield (0, db_1.default)('JobsTables').where({ JobId: aid }).first();
                        const addonTariff = tariffPlansData.find(t => t.JobId === aid);
                        if (addonJob && addonTariff) {
                            const addon = {
                                TypeOfJob: addonJob.TypeOfJob,
                                JobTitle: addonJob.JobTitle,
                                AddonId: aid,
                                MinVal: addonTariff.Minval,
                                MaxVal: addonTariff.Maxval,
                            };
                            const sizeMap = {
                                '1Bhk': ['C1Bhk', 'C1CF', 'C1DCF', 'C1BhkDuration'],
                                '2Bhk': ['C2Bhk', 'C2CF', 'C2DCF', 'C2BhkDuration'],
                                '3Bhk': ['C3Bhk', 'C3CF', 'C3DCF', 'C3BhkDuration'],
                                '4Bhk': ['C4Bhk', 'C4CF', 'C4DCF', 'C3_BhkDuration'],
                                'Villa': ['Villa', 'VillaCF', 'VillaDCF', 'VillaDuration']
                            };
                            if (addonJob.HouseFlag === 1 && ['Single', 'Bundle'].includes(addonJob.TypeOfJob)) {
                                const [price, cf, dcf, dur] = sizeMap[HouseSize] || [];
                                addon.Price = addonTariff[price];
                                addon.ConvenienceFee = addonTariff[cf];
                                addon.DiscountConvenienceFee = addonTariff[dcf];
                                addon.Duration = addonTariff[dur];
                            }
                            else if (addonJob.TypeOfJob === 'Single') {
                                addon.Price = addonTariff.Price;
                                addon.Duration = addonTariff.IndividualJobDuration;
                            }
                            else if (addonJob.TypeOfJob === 'Bundle') {
                                addon.Price = addonTariff.IncrementPrice;
                                addon.Duration = addonTariff.IndividualJobDuration;
                            }
                            addonArray.push(addon);
                        }
                    }
                    jobData.AddonsMapping = addonArray;
                }
                // Type-specific tariff handling
                const matchedTariffs = tariffPlansData.filter(t => t.JobId === j.JobId);
                for (const t of matchedTariffs) {
                    const setPricing = (priceKey, cfKey, dcfKey, durKey) => {
                        jobData.Price = t[priceKey];
                        jobData.ConvenienceFee = t[cfKey];
                        jobData.DiscountConvenienceFee = t[dcfKey];
                        jobData.Duration = t[durKey];
                    };
                    if (['Single', 'Bundle'].includes(j.TypeOfJob)) {
                        if (j.HouseFlag === 1) {
                            const sizeMap = {
                                '1Bhk': ['C1Bhk', 'C1CF', 'C1DCF', 'C1BhkDuration'],
                                '2Bhk': ['C2Bhk', 'C2CF', 'C2DCF', 'C2BhkDuration'],
                                '3Bhk': ['C3Bhk', 'C3CF', 'C3DCF', 'C3BhkDuration'],
                                '4Bhk': ['C4Bhk', 'C4CF', 'C4DCF', 'C3_BhkDuration'],
                                'Villa': ['Villa', 'VillaCF', 'VillaDCF', 'VillaDuration']
                            };
                            const [p, cf, dcf, dur] = sizeMap[HouseSize];
                            setPricing(p, cf, dcf, dur);
                        }
                        else {
                            jobData.Price = t.Price;
                            jobData.ConvenienceFee = t.CF;
                            jobData.DiscountConvenienceFee = t.DCF;
                            jobData.Duration = t.IndividualJobDuration;
                        }
                    }
                    else if (j.TypeOfJob === 'Clothes') {
                        jobData.Price = t.Price;
                        jobData.ConvenienceFee = t.CF;
                        jobData.DiscountConvenienceFee = t.DCF;
                        jobData.Duration = t.IndividualJobDuration;
                    }
                    else if (j.TypeOfJob === 'Cooking') {
                        const cooking = yield (0, db_1.default)('CookingTariffPlans').where({ JobId: j.JobId }).first();
                        if (cooking) {
                            Object.assign(jobData, {
                                Price: cooking.Price,
                                Duration: cooking.Duration,
                                IncrementPrice: cooking.IncrementPrice,
                                Extra: cooking.Extra,
                                VegitableChoppingMinimal: cooking.VegitableChoppingMinimal,
                                VegitableChoppingHigh: cooking.VegitableChoppingHigh,
                                ConvenienceFee: cooking.CF,
                                DiscountConvenienceFee: cooking.DCF,
                            });
                        }
                    }
                }
                jobsResult.push(jobData);
            }
        }
        (0, responseWrapper_1.successResponse)(res, 'Jobs fetched successfully', jobsResult);
    }
    catch (err) {
        console.error('Error fetching job list:', err);
        (0, responseWrapper_1.errorResponse)(res, 'Internal Server Error', 500);
    }
});
exports.getJobListsOrder = getJobListsOrder;
