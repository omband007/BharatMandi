import { Router, Request, Response } from 'express';
import { transactionService } from './transaction.service';

const router = Router();

/**
 * POST /api/transactions
 * Initiate a purchase
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { listingId, farmerId, buyerId, amount } = req.body;

    // Validation
    if (!listingId || !farmerId || !amount) {
      return res.status(400).json({ error: 'Missing required fields: listingId, farmerId, amount' });
    }

    // For testing: if buyerId is missing, use farmerId (same user can test both roles)
    const effectiveBuyerId = buyerId || farmerId;

    const transaction = await transactionService.initiatePurchase(
      listingId,
      farmerId,
      effectiveBuyerId,
      amount
    );

    res.status(201).json(transaction);
  } catch (error) {
    console.error('[Transaction] Error initiating purchase:', error);
    res.status(500).json({ error: 'Failed to initiate purchase' });
  }
});

/**
 * POST /api/transactions/:id/accept
 * Accept an order
 */
router.post('/:id/accept', async (req: Request, res: Response) => {
  try {
    const transaction = await transactionService.acceptOrder(req.params.id);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Create escrow
    const escrow = await transactionService.createEscrow(transaction.id, transaction.amount);

    res.json({ transaction, escrow });
  } catch (error) {
    console.error('[Transaction] Error accepting order:', error);
    res.status(500).json({ error: 'Failed to accept order' });
  }
});

/**
 * POST /api/transactions/:id/lock-payment
 * Lock payment in escrow
 */
router.post('/:id/lock-payment', async (req: Request, res: Response) => {
  try {
    const result = await transactionService.lockPayment(req.params.id);
    if (!result.transaction) {
      return res.status(404).json({ error: 'Transaction or escrow not found' });
    }
    res.json(result);
  } catch (error) {
    console.error('[Transaction] Error locking payment:', error);
    res.status(500).json({ error: 'Failed to lock payment' });
  }
});

/**
 * POST /api/transactions/:id/dispatch
 * Mark transaction as dispatched
 */
router.post('/:id/dispatch', async (req: Request, res: Response) => {
  try {
    const transaction = await transactionService.markDispatched(req.params.id);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json(transaction);
  } catch (error) {
    console.error('[Transaction] Error marking as dispatched:', error);
    res.status(500).json({ error: 'Failed to mark as dispatched' });
  }
});

/**
 * POST /api/transactions/:id/deliver
 * Mark transaction as delivered
 */
router.post('/:id/deliver', async (req: Request, res: Response) => {
  try {
    const transaction = await transactionService.markDelivered(req.params.id);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json(transaction);
  } catch (error) {
    console.error('[Transaction] Error marking as delivered:', error);
    res.status(500).json({ error: 'Failed to mark as delivered' });
  }
});

/**
 * POST /api/transactions/:id/release-funds
 * Release funds from escrow
 */
router.post('/:id/release-funds', async (req: Request, res: Response) => {
  try {
    const result = await transactionService.releaseFunds(req.params.id);
    if (!result.transaction) {
      return res.status(404).json({ error: 'Transaction or escrow not found' });
    }
    res.json(result);
  } catch (error) {
    console.error('[Transaction] Error releasing funds:', error);
    res.status(500).json({ error: 'Failed to release funds' });
  }
});

/**
 * GET /api/transactions/:id
 * Get transaction by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const transaction = await transactionService.getTransaction(req.params.id);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json(transaction);
  } catch (error) {
    console.error('[Transaction] Error fetching transaction:', error);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

// Export as transactionController for feature-based architecture
export const transactionController = router;
