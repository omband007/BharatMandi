import { Router, Request, Response } from 'express';
import multer from 'multer';
import { gradingService } from './grading.service';

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  }
});

// POST /api/grading/grade-with-image - Grade produce with actual image upload
router.post('/grade-with-image', upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }

    const { farmerId, produceType, lat, lng, autoDetect } = req.body;

    if (!farmerId || !lat || !lng) {
      return res.status(400).json({ 
        error: 'Missing required fields: farmerId, lat, lng' 
      });
    }

    const location = {
      lat: parseFloat(lat),
      lng: parseFloat(lng)
    };

    const shouldAutoDetect = autoDetect === 'true';

    // Grade the image using AI
    const { gradingResult, analysis } = await gradingService.gradeProduceImage(
      req.file.buffer,
      location
    );

    // Determine final produce type
    let finalProduceType = produceType || 'unknown';
    if (shouldAutoDetect && analysis.detectedCrop !== 'unknown') {
      finalProduceType = analysis.detectedCrop;
    }

    // Generate certificate
    const certificate = gradingService.generateCertificate(
      farmerId,
      finalProduceType,
      gradingResult,
      req.file.buffer,
      analysis.detectedCrop
    );

    res.json({
      gradingResult,
      certificate,
      analysis
    });
  } catch (error: any) {
    console.error('Grading error:', error);
    res.status(500).json({ error: error.message || 'Failed to grade image' });
  }
});

// POST /api/grading/grade - Legacy endpoint (base64)
router.post('/grade', async (req: Request, res: Response) => {
  try {
    const { farmerId, produceType, imageData, location } = req.body;

    if (!farmerId || !produceType || !imageData || !location) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Convert base64 to buffer if needed
    let imageBuffer: Buffer;
    if (imageData.startsWith('data:image')) {
      const base64Data = imageData.split(',')[1];
      imageBuffer = Buffer.from(base64Data, 'base64');
    } else {
      imageBuffer = Buffer.from(imageData, 'base64');
    }

    // Grade the image
    const { gradingResult, analysis } = await gradingService.gradeProduceImage(
      imageBuffer,
      location
    );

    // Generate certificate
    const certificate = gradingService.generateCertificate(
      farmerId,
      produceType,
      gradingResult,
      imageBuffer,
      analysis.detectedCrop
    );

    res.json({
      gradingResult,
      certificate,
      analysis
    });
  } catch (error: any) {
    console.error('Grading error:', error);
    res.status(500).json({ error: error.message || 'Failed to grade image' });
  }
});

// GET /api/grading/certificates - Get certificates by farmer ID
router.get('/certificates', async (req: Request, res: Response) => {
  try {
    const { farmerId } = req.query;

    if (!farmerId) {
      return res.status(400).json({ error: 'farmerId query parameter is required' });
    }

    // Get all certificates from memory DB
    const { db } = await import('../../shared/database/memory-db');
    const allCertificates = Array.from(db['certificates'].values());
    
    // Filter by farmer ID
    const farmerCertificates = allCertificates.filter(cert => cert.farmerId === farmerId);

    res.json(farmerCertificates);
  } catch (error: any) {
    console.error('Get certificates error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch certificates' });
  }
});

// Export as gradingController for feature-based architecture
export const gradingController = router;
