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
      fromName: `${user.firstName} ${user.lastName}`,
      fromEmail: user.email,
      subject,
      message,
    });

    res.json({ success: true });
  }
);

module.exports = router;
