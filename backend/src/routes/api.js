import { Router } from 'express';
import { getHealth } from '../controllers/healthController.js';
import { handleChat, getModels } from '../controllers/chatController.js';

const router = Router();

router.get('/health', getHealth);
router.get('/models', getModels);
router.post('/chat', handleChat);

export default router;
