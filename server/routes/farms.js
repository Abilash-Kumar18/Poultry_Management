const express = require('express');
const Farm = require('../models/Farm');
const Visitor = require('../models/Visitor');
const DiseaseAlert = require('../models/DiseaseAlert');
const BiosecurityChecklist = require('../models/BiosecurityChecklist');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/farms/stats/overview — must come BEFORE /:id
router.get('/stats/overview', async (req, res) => {
  try {
    const totalFarms = await Farm.countDocuments();
    const healthyFarms = await Farm.countDocuments({ health_status: 'healthy' });
    const warningFarms = await Farm.countDocuments({ health_status: 'warning' });
    const criticalFarms = await Farm.countDocuments({ health_status: 'critical' });
    
    const avgResult = await Farm.aggregate([
      { $group: { _id: null, avgScore: { $avg: '$biosecurity_score' } } }
    ]);
    const avgBiosecurityScore = avgResult.length > 0 ? Math.round(avgResult[0].avgScore * 10) / 10 : 0;
    
    const activeAlerts = await DiseaseAlert.countDocuments({ status: 'active' });
    const pendingVisitors = await Visitor.countDocuments({ status: 'pending' });
    
    const todayStr = new Date().toISOString().split('T')[0];
    const todayVisitors = await Visitor.countDocuments({ visit_date: { $regex: `^${todayStr}` } });
    
    res.json({
      stats: {
        totalFarms,
        healthyFarms,
        warningFarms,
        criticalFarms,
        avgBiosecurityScore,
        activeAlerts,
        pendingVisitors,
        todayVisitors
      }
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats.' });
  }
});

// GET /api/farms
router.get('/', async (req, res) => {
  try {
    const { type, health_status, search } = req.query;
    const filter = {};
    
    if (type) filter.type = type;
    if (health_status) filter.health_status = health_status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }
    
    const farms = await Farm.find(filter).sort({ created_at: -1 });
    
    // Add computed fields
    const enriched = await Promise.all(farms.map(async (farm) => {
      const farmJson = farm.toJSON();
      farmJson.pending_visitors = await Visitor.countDocuments({ farm_id: farm.id, status: 'pending' });
      farmJson.active_alerts = await DiseaseAlert.countDocuments({ farm_id: farm.id, status: 'active' });
      return farmJson;
    }));
    
    res.json({ farms: enriched });
  } catch (err) {
    console.error('Get farms error:', err);
    res.status(500).json({ error: 'Failed to fetch farms.' });
  }
});

// POST /api/farms
router.post('/', async (req, res) => {
  try {
    const { name, type, location, capacity, description } = req.body;
    if (!name || !type || !location || !capacity) {
      return res.status(400).json({ error: 'Name, type, location, and capacity are required.' });
    }
    
    const farm = new Farm({
      name: name.trim(),
      type,
      location: location.trim(),
      capacity: parseInt(capacity),
      owner_id: req.user.id,
      description: description || null
    });
    
    await farm.save();
    res.status(201).json({ farm, message: 'Farm created successfully.' });
  } catch (err) {
    console.error('Create farm error:', err);
    res.status(500).json({ error: 'Failed to create farm.' });
  }
});

// GET /api/farms/:id
router.get('/:id', async (req, res) => {
  try {
    const farm = await Farm.findById(req.params.id);
    if (!farm) return res.status(404).json({ error: 'Farm not found.' });
    
    const farmJson = farm.toJSON();
    farmJson.total_visitors = await Visitor.countDocuments({ farm_id: farm.id });
    farmJson.pending_visitors = await Visitor.countDocuments({ farm_id: farm.id, status: 'pending' });
    farmJson.active_alerts = await DiseaseAlert.countDocuments({ farm_id: farm.id, status: 'active' });
    farmJson.completed_checks = await BiosecurityChecklist.countDocuments({ farm_id: farm.id, status: 'completed' });
    farmJson.total_checks = await BiosecurityChecklist.countDocuments({ farm_id: farm.id });

    const recentAlerts = await DiseaseAlert.find({ farm_id: farm.id }).sort({ created_at: -1 }).limit(5);
    const recentVisitors = await Visitor.find({ farm_id: farm.id }).sort({ visit_date: -1 }).limit(5);
    
    res.json({ farm: farmJson, recentAlerts, recentVisitors });
  } catch (err) {
    console.error('Get farm error:', err);
    res.status(500).json({ error: 'Failed to fetch farm.' });
  }
});

// PUT /api/farms/:id
router.put('/:id', async (req, res) => {
  try {
    const farm = await Farm.findById(req.params.id);
    if (!farm) return res.status(404).json({ error: 'Farm not found.' });
    
    const { name, type, location, capacity, health_status, biosecurity_score, description } = req.body;
    
    if (name !== undefined) farm.name = name.trim();
    if (type !== undefined) farm.type = type;
    if (location !== undefined) farm.location = location;
    if (capacity !== undefined) farm.capacity = parseInt(capacity);
    if (health_status !== undefined) farm.health_status = health_status;
    if (biosecurity_score !== undefined) farm.biosecurity_score = parseInt(biosecurity_score);
    if (description !== undefined) farm.description = description;
    
    await farm.save();
    res.json({ farm, message: 'Farm updated successfully.' });
  } catch (err) {
    console.error('Update farm error:', err);
    res.status(500).json({ error: 'Failed to update farm.' });
  }
});

// DELETE /api/farms/:id
router.delete('/:id', async (req, res) => {
  try {
    const farm = await Farm.findById(req.params.id);
    if (!farm) return res.status(404).json({ error: 'Farm not found.' });
    
    await Farm.deleteOne({ _id: farm.id });
    
    // Cascading delete is recommended in production
    await Visitor.deleteMany({ farm_id: farm.id });
    await DiseaseAlert.deleteMany({ farm_id: farm.id });
    await BiosecurityChecklist.deleteMany({ farm_id: farm.id });
    
    res.json({ message: 'Farm deleted successfully.' });
  } catch (err) {
    console.error('Delete farm error:', err);
    res.status(500).json({ error: 'Failed to delete farm.' });
  }
});

module.exports = router;
