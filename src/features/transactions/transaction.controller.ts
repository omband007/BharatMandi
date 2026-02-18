import { Router, Request, Response } from 'express';
import { transactionService } from './transaction.service';

const router = Router();

/**
 * POST /api/transactions
 * Initiate a purchase
 */
router.post('/', (req: Request, res: Response) => {
  const { listingId, farmerId, buyerId, amount } = req.body;

  const transaction = transactionService.initiatePurchase(
    listingId,
    farmerId,
    buyerId,
    amount
  );

  res.status(201).json(transaction);
});

/**
 * POST /api/transactions/:id/accept
 * Accept an order
 */
router.post('/:id/accept', (req: Request, res: Response) => {
  const transaction = transactionService.acceptOrder(req.params.id);
  if (!transaction) {
    return res.status(404).json({ error: 'Transaction not found' });
  }

  // Create escrow
  const escrow = transactionService.createEscrow(transaction.id, transaction.amount);

  res.json({ transaction, escrow });
});

/**
 * POST /api/transactions/:id/lock-payment
 * Lock payment in escrow
 */
router.post('/:id/lock-payment', (req: Request, res: Response) => {
  const result = transactionService.lockPayment(req.params.id);
  if (!result.transaction) {
    return res.status(404).json({ error: 'Transaction or escrow not found' });
  }
  res.json(result);
});

/**
 * POST /api/transactions/:id/dispatch
 * Mark transaction as dispatched
 */
router.post('/:id/dispatch', (req: Request, res: Response) => {
  const transaction = transactionService.markDispatched(req.params.id);
  if (!transaction) {
    return res.status(404).json({ error: 'Transaction not found' });
  }
  res.json(transaction);
});

/**
 * POST /api/transactions/:id/deliver
 * Mark transaction as delivered
 */
router.post('/:id/deliver', (req: Request, res: Response) => {
  const transaction = transactionService.markDelivered(req.params.id);
  if (!transaction) {
    return res.status(404).json({ error: 'Transaction not found' });
  }
  res.json(transaction);
});

/**
 * POST /api/transactions/:id/release-funds
 * Release funds from escrow
 */
router.post('/:id/release-funds', (req: Request, res: Response) => {
  const result = transactionService.releaseFunds(req.params.id);
  if (!result.transaction) {
    return res.status(404).json({ error: 'Transaction or escrow not found' });
  }
  res.json(result);
});

/**
 * GET /api/transactions/:id
 * Get transaction by ID
 */
router.get('/:id', (req: Request, res: Response) => {
  const transaction = transactionService.getTransaction(req.params.id);
  if (!transaction) {
    return res.status(404).json({ error: 'Transaction not found' });
  }
  res.json(transaction);
});

// Export as transactionController for feature-based architecture
export const transactionController = router;
