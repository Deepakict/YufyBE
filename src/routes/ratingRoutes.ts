import express from 'express';
import { checkHelperFeedback, updateHelperRating } from '../controllers/ratingController';

const router = express.Router();

router.post('/check-helper-feedback', checkHelperFeedback);
router.post('/update-helper-rating', updateHelperRating);


export default router;