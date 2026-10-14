import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { getGemBySlug, getGemFilters, listGems, listGemsQuery, slugParams } from '../controllers/gemController.js';

const router = Router();

router.get('/', validate(listGemsQuery, 'query'), listGems);
router.get('/filters', getGemFilters);
router.get('/:slug', validate(slugParams, 'params'), getGemBySlug);

export default router;
