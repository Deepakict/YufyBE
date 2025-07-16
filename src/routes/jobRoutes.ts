import express from 'express';
import { getHelperAvailabilityDetails, getJobListsOrder, getSuggestedHelpers } from '../controllers/jobController';

const router = express.Router();

router.post('/get-jobList', getJobListsOrder);
router.post('/get-suggested-helpers', getSuggestedHelpers);
router.post('/get-helpers-availability', getHelperAvailabilityDetails);


export default router;