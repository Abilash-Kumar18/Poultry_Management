const express = require('express');
const Visitor = require('../models/Visitor');
const Farm = require('../models/Farm');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/visitors/export — must come BEFORE /:id
router.get('/export', async (req, res) => {
  try {
    const { farm_id, status, start_date, end_date } = req.query;
    const filter = {};
    
    if (farm_id) filter.farm_id = farm_id;
    if (status) filter.status = status;
    if (start_date || end_date) {
      filter.visit_date = {};
      if (start_date) filter.visit_date.$gte = start_date;
      if (end_date) filter.visit_date.$lte = end_date + 'T23:59:59';
    }
    
    const visitors = await Visitor.find(filter)
      .populate('farm_id', 'name type')
      .sort({ visit_date: -1 });

    const headers = ['Name', 'Contact', 'Company', 'Purpose', 'Farm', 'Visit Date', 'Vehicle Number', 'Status', 'Registered At'];
    const rows = visitors.map(v => [
      v.name,
      v.contact,
      v.company || '',
      v.purpose,
      v.farm_id ? v.farm_id.name : '',
      v.visit_date,
      v.vehicle_number || '',
      v.status,
      v.created_at ? v.created_at.toISOString() : ''
    ]);
    
    const csv = [headers, ...rows].map(r => r.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="visitors_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ error: 'Failed to export visitors.' });
  }
});

// GET /api/visitors
router.get('/', async (req, res) => {
  try {
    const { farm_id, status, start_date, end_date, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    
    if (farm_id) filter.farm_id = farm_id;
    if (status) filter.status = status;
    if (start_date || end_date) {
      filter.visit_date = {};
      if (start_date) filter.visit_date.$gte = start_date;
      if (end_date) filter.visit_date.$lte = end_date + 'T23:59:59';
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { contact: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Visitor.countDocuments(filter);
    
    const limitNum = parseInt(limit);
    const pageNum = parseInt(page);
    const skipNum = (pageNum - 1) * limitNum;

    const visitors = await Visitor.find(filter)
      .populate('farm_id', 'name type')
      .sort({ created_at: -1 })
      .skip(skipNum)
      .limit(limitNum);

    // Transform populated farm_id into farm_name and farm_type for frontend compatibility
    const enriched = visitors.map(v => {
      const visitorJson = v.toJSON();
      if (v.farm_id) {
        visitorJson.farm_name = v.farm_id.name;
        visitorJson.farm_type = v.farm_id.type;
        visitorJson.farm_id = v.farm_id.id; // Map back to ID string
      } else {
        visitorJson.farm_name = 'Unknown Farm';
        visitorJson.farm_type = 'mixed';
      }
      return visitorJson;
    });

    res.json({
      visitors: enriched,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    console.error('Get visitors error:', err);
    res.status(500).json({ error: 'Failed to fetch visitors.' });
  }
});

// POST /api/visitors
router.post('/', async (req, res) => {
  try {
    const { name, contact, company, purpose, farm_id, visit_date, vehicle_number, health_declaration } = req.body;
    if (!name || !contact || !purpose || !farm_id || !visit_date) {
      return res.status(400).json({ error: 'Name, contact, purpose, farm, and visit date are required.' });
    }
    
    const farm = await Farm.findById(farm_id);
    if (!farm) return res.status(400).json({ error: 'Invalid farm ID.' });

    const visitor = new Visitor({
      name: name.trim(),
      contact: contact.trim(),
      company: company ? company.trim() : null,
      purpose: purpose.trim(),
      farm_id,
      visit_date,
      vehicle_number: vehicle_number ? vehicle_number.trim() : null,
      health_declaration: health_declaration || null,
      created_by: req.user.id
    });
    
    await visitor.save();

    const visitorJson = visitor.toJSON();
    visitorJson.farm_name = farm.name;
    visitorJson.farm_type = farm.type;

    res.status(201).json({ visitor: visitorJson, message: 'Visitor registered successfully.' });
  } catch (err) {
    console.error('Create visitor error:', err);
    res.status(500).json({ error: 'Failed to register visitor.' });
  }
});

// GET /api/visitors/:id
router.get('/:id', async (req, res) => {
  try {
    const visitor = await Visitor.findById(req.params.id).populate('farm_id', 'name type');
    if (!visitor) return res.status(404).json({ error: 'Visitor not found.' });
    
    const visitorJson = visitor.toJSON();
    if (visitor.farm_id) {
      visitorJson.farm_name = visitor.farm_id.name;
      visitorJson.farm_type = visitor.farm_id.type;
      visitorJson.farm_id = visitor.farm_id.id;
    }
    
    res.json({ visitor: visitorJson });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch visitor.' });
  }
});

// PUT /api/visitors/:id/approve
router.put('/:id/approve', async (req, res) => {
  try {
    const visitor = await Visitor.findById(req.params.id);
    if (!visitor) return res.status(404).json({ error: 'Visitor not found.' });
    
    visitor.status = 'approved';
    await visitor.save();
    
    res.json({ message: 'Visitor approved successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve visitor.' });
  }
});

// PUT /api/visitors/:id/reject
router.put('/:id/reject', async (req, res) => {
  try {
    const visitor = await Visitor.findById(req.params.id);
    if (!visitor) return res.status(404).json({ error: 'Visitor not found.' });
    
    visitor.status = 'rejected';
    await visitor.save();
    
    res.json({ message: 'Visitor rejected.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reject visitor.' });
  }
});

// PUT /api/visitors/:id
router.put('/:id', async (req, res) => {
  try {
    const visitor = await Visitor.findById(req.params.id);
    if (!visitor) return res.status(404).json({ error: 'Visitor not found.' });
    
    const { name, contact, company, purpose, vehicle_number, status } = req.body;
    
    if (name !== undefined) visitor.name = name;
    if (contact !== undefined) visitor.contact = contact;
    if (company !== undefined) visitor.company = company;
    if (purpose !== undefined) visitor.purpose = purpose;
    if (vehicle_number !== undefined) visitor.vehicle_number = vehicle_number;
    if (status !== undefined) visitor.status = status;
    
    await visitor.save();
    
    const populated = await Visitor.findById(visitor.id).populate('farm_id', 'name type');
    const visitorJson = populated.toJSON();
    if (populated.farm_id) {
      visitorJson.farm_name = populated.farm_id.name;
      visitorJson.farm_id = populated.farm_id.id;
    }
    
    res.json({ visitor: visitorJson, message: 'Visitor updated.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update visitor.' });
  }
});

module.exports = router;
