const express = require('express');
const path = require('path');
const multer = require('multer');
const BiosecurityChecklist = require('../models/BiosecurityChecklist');
const Farm = require('../models/Farm');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    require('fs').mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `biosec_${Date.now()}_${Math.random().toString(36).slice(2, 10)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files allowed'));
  }
});

// GET /api/biosecurity/summary
router.get('/summary', async (req, res) => {
  try {
    const { farm_id } = req.query;
    const filter = {};
    if (farm_id) filter.farm_id = farm_id;
    
    // Aggregate status and category counts in MongoDB
    const rows = await BiosecurityChecklist.aggregate([
      { $match: filter ? { farm_id: new require('mongoose').Types.ObjectId(farm_id) } : {} },
      { $group: { _id: { status: '$status', category: '$category' }, cnt: { $sum: 1 } } }
    ]).catch(() => []); // Fallback if farm_id object mapping fails

    const summary = { total: 0, completed: 0, pending: 0, daily_total: 0, weekly_total: 0, monthly_total: 0 };
    rows.forEach(r => {
      const { status, category } = r._id;
      summary.total += r.cnt;
      if (status === 'completed') summary.completed += r.cnt;
      if (status === 'pending') summary.pending += r.cnt;
      if (category === 'daily') summary.daily_total += r.cnt;
      if (category === 'weekly') summary.weekly_total += r.cnt;
      if (category === 'monthly') summary.monthly_total += r.cnt;
    });
    
    res.json({ summary });
  } catch (err) {
    console.error('Summary error:', err);
    res.status(500).json({ error: 'Failed to fetch summary.' });
  }
});

// GET /api/biosecurity/checklists
router.get('/checklists', async (req, res) => {
  try {
    const { farm_id, category, status } = req.query;
    const filter = {};
    
    if (farm_id) filter.farm_id = farm_id;
    if (category) filter.category = category;
    if (status) filter.status = status;
    
    const checklists = await BiosecurityChecklist.find(filter)
      .populate('farm_id', 'name')
      .sort({ due_date: 1, created_at: -1 });
      
    const enriched = checklists.map(c => {
      const cJson = c.toJSON();
      if (c.farm_id) {
        cJson.farm_name = c.farm_id.name;
        cJson.farm_id = c.farm_id.id;
      } else {
        cJson.farm_name = 'Unknown Farm';
      }
      return cJson;
    });
    
    res.json({ checklists: enriched });
  } catch (err) {
    console.error('Get checklists error:', err);
    res.status(500).json({ error: 'Failed to fetch checklists.' });
  }
});

// POST /api/biosecurity/checklists
router.post('/checklists', async (req, res) => {
  try {
    const { farm_id, protocol_name, category = 'daily', due_date, notes } = req.body;
    if (!farm_id || !protocol_name) return res.status(400).json({ error: 'Farm ID and protocol name are required.' });
    
    const farm = await Farm.findById(farm_id);
    if (!farm) return res.status(400).json({ error: 'Invalid farm ID.' });

    const now = new Date();
    const checklist = new BiosecurityChecklist({
      farm_id,
      protocol_name: protocol_name.trim(),
      category,
      due_date: due_date || now.toISOString().split('T')[0],
      notes: notes || null
    });
    
    await checklist.save();
    
    const checklistJson = checklist.toJSON();
    checklistJson.farm_name = farm.name;

    res.status(201).json({ checklist: checklistJson, message: 'Checklist item created.' });
  } catch (err) {
    console.error('Create checklist error:', err);
    res.status(500).json({ error: 'Failed to create checklist item.' });
  }
});

// PUT /api/biosecurity/checklists/:id
router.put('/checklists/:id', async (req, res) => {
  try {
    const checklist = await BiosecurityChecklist.findById(req.params.id);
    if (!checklist) return res.status(404).json({ error: 'Checklist item not found.' });
    
    const { status, notes } = req.body;
    
    if (status !== undefined) {
      checklist.status = status;
      checklist.completed_at = status === 'completed' ? new Date() : null;
      checklist.completed_by = status === 'completed' ? req.user.name : null;
    }
    if (notes !== undefined) checklist.notes = notes;
    
    await checklist.save();

    // Recalculate farm biosecurity score
    const farmId = checklist.farm_id;
    const totalChecks = await BiosecurityChecklist.countDocuments({ farm_id: farmId });
    const completedChecks = await BiosecurityChecklist.countDocuments({ farm_id: farmId, status: 'completed' });
    if (totalChecks > 0) {
      const score = Math.round((completedChecks / totalChecks) * 100);
      const health = score >= 80 ? 'healthy' : score >= 60 ? 'warning' : 'critical';
      await Farm.findByIdAndUpdate(farmId, { biosecurity_score: score, health_status: health });
    }

    const populated = await BiosecurityChecklist.findById(checklist.id).populate('farm_id', 'name');
    const checklistJson = populated.toJSON();
    if (populated.farm_id) {
      checklistJson.farm_name = populated.farm_id.name;
      checklistJson.farm_id = populated.farm_id.id;
    }
    
    res.json({ checklist: checklistJson, message: 'Checklist updated.' });
  } catch (err) {
    console.error('Update checklist error:', err);
    res.status(500).json({ error: 'Failed to update checklist.' });
  }
});

// POST /api/biosecurity/upload-photo
router.post('/upload-photo', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No photo uploaded.' });
    const { checklist_id } = req.body;
    
    if (checklist_id) {
      await BiosecurityChecklist.findByIdAndUpdate(checklist_id, { photo_url: `/uploads/${req.file.filename}` });
    }
    
    res.json({ photoUrl: `/uploads/${req.file.filename}`, message: 'Photo uploaded successfully.' });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Failed to upload photo.' });
  }
});

module.exports = router;
