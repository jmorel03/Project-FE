const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { sendSupportEmail } = require('../services/emailService');
const prisma = require('../lib/prisma');

const router = express.Router();

router.post(
  '/contact',
  authenticate,
  [
    body('subject').trim().notEmpty().withMessage('Subject is required').isLength({ max: 200 }),
    body('message').trim().notEmpty().withMessage('Message is required').isLength({ max: 5000 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
      }

      const { subject, message } = req.body;

      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { firstName: true, lastName: true, email: true },
      });

      if (!user) return res.status(404).json({ error: 'User not found' });

      await sendSupportEmail({
        fromName: `${user.firstName} ${user.lastName}`.trim() || 'Xpensist User',
        fromEmail: user.email,
        subject,
        message,
      });

      return res.json({ success: true });
    } catch (err) {
      if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.FROM_EMAIL) {
        return res.status(500).json({ error: 'Support email is not configured yet. Please contact support directly.' });
      }
      return res.status(500).json({ error: 'Unable to send support message right now. Please try again shortly.' });
    }
  }
);

module.exports = router;
