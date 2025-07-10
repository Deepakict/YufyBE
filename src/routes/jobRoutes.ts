import express from 'express';
import { getHelperAvailabilityDetails, getHelpersWithAvailableSlots, getJobListsOrder, getSuggestedHelpers } from '../controllers/jobController';

const router = express.Router();

router.post('/get-jobList', getJobListsOrder);
router.post('/get-suggested-helpers', getSuggestedHelpers);
router.post('/get-helpers-availability', getHelperAvailabilityDetails);
router.post('/get-helpers-with-slots', getHelpersWithAvailableSlots);


export default router;