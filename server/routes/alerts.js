const express = require('express');
const DiseaseAlert = require('../models/DiseaseAlert');
const Farm = require('../models/Farm');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/alerts
router.get('/', async (req, res) => {
  try {
    const { farm_id, severity, status, search } = req.query;
    const filter = {};
    
    if (farm_id) filter.farm_id = farm_id;
    if (severity) filter.severity = severity;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    const alerts = await DiseaseAlert.find(filter)
      .populate('farm_id', 'name type')
      .sort({ created_at: -1 });
      
    const enriched = alerts.map(a => {
      const aJson = a.toJSON();
      if (a.farm_id) {
        aJson.farm_name = a.farm_id.name;
        aJson.farm_type = a.farm_id.type;
        aJson.farm_id = a.farm_id.id;
      } else {
        aJson.farm_name = 'Unknown Farm';
        aJson.farm_type = 'mixed';
      }
      return aJson;
    });
    
    // Sort by custom order: critical -> high -> medium -> low
    const severityOrder = { critical: 1, high: 2, medium: 3, low: 4 };
    enriched.sort((a, b) => {
      const orderA = severityOrder[a.severity] || 4;
      const orderB = severityOrder[b.severity] || 4;
      if (orderA !== orderB) return orderA - orderB;
      return new Date(b.created_at) - new Date(a.created_at);
    });
    
    res.json({ alerts: enriched });
  } catch (err) {
    console.error('Get alerts error:', err);
    res.status(500).json({ error: 'Failed to fetch alerts.' });
  }
});

// POST /api/alerts
router.post('/', async (req, res) => {
  try {
    const { farm_id, title, severity = 'low', description, symptoms, actions, affected_animals = 0 } = req.body;
    if (!farm_id || !title) return res.status(400).json({ error: 'Farm ID and title are required.' });
    
    const farm = await Farm.findById(farm_id);
    if (!farm) return res.status(400).json({ error: 'Invalid farm ID.' });

    const alert = new DiseaseAlert({
      farm_id,
      title: title.trim(),
      severity,
      description: description || null,
      symptoms: symptoms || null,
      actions: actions || null,
      affected_animals: parseInt(affected_animals),
      created_by: req.user.id
    });
    
    await alert.save();
    
    // Dynamically adjust farm health status based on alert severity
    if (severity === 'critical') {
      await Farm.findByIdAndUpdate(farm_id, { health_status: 'critical' });
    } else if (severity === 'high') {
      await Farm.findByIdAndUpdate(farm_id, { health_status: 'warning' });
    }

    // Trigger real-time Nodemailer outbreak email dispatch in the background
    const { sendOutbreakEmail } = require('../utils/mail');
    sendOutbreakEmail(req.user.email, alert, farm).catch(err => {
      console.error('Real-time notification email failed to send:', err);
    });
    
    const alertJson = alert.toJSON();
    alertJson.farm_name = farm.name;

    res.status(201).json({ alert: alertJson, message: 'Alert created successfully.' });
  } catch (err) {
    console.error('Create alert error:', err);
    res.status(500).json({ error: 'Failed to create alert.' });
  }
});

// PUT /api/alerts/:id
router.put('/:id', async (req, res) => {
  try {
    const alert = await DiseaseAlert.findById(req.params.id);
    if (!alert) return res.status(404).json({ error: 'Alert not found.' });
    
    const { title, severity, description, symptoms, actions, status, affected_animals } = req.body;
    
    if (title !== undefined) alert.title = title;
    if (severity !== undefined) alert.severity = severity;
    if (description !== undefined) alert.description = description;
    if (symptoms !== undefined) alert.symptoms = symptoms;
    if (actions !== undefined) alert.actions = actions;
    if (status !== undefined) {
      if (status === 'resolved' && alert.status !== 'resolved') {
        alert.resolved_at = new Date();
      }
      alert.status = status;
    }
    if (affected_animals !== undefined) alert.affected_animals = parseInt(affected_animals);
    
    await alert.save();
    
    // If an alert is resolved, check if there are other active severe alerts on the farm
    if (status === 'resolved') {
      const activeSevereCount = await DiseaseAlert.countDocuments({
        farm_id: alert.farm_id,
        status: 'active',
        severity: { $in: ['critical', 'high'] }
      });
      if (activeSevereCount === 0) {
        await Farm.findByIdAndUpdate(alert.farm_id, { health_status: 'healthy' });
      }
    }
    
    const populated = await DiseaseAlert.findById(alert.id).populate('farm_id', 'name');
    const alertJson = populated.toJSON();
    if (populated.farm_id) {
      alertJson.farm_name = populated.farm_id.name;
      alertJson.farm_id = populated.farm_id.id;
    }
    
    res.json({ alert: alertJson, message: 'Alert updated successfully.' });
  } catch (err) {
    console.error('Update alert error:', err);
    res.status(500).json({ error: 'Failed to update alert.' });
  }
});

// DELETE /api/alerts/:id
router.delete('/:id', async (req, res) => {
  try {
    const alert = await DiseaseAlert.findById(req.params.id);
    if (!alert) return res.status(404).json({ error: 'Alert not found.' });
    
    await DiseaseAlert.deleteOne({ _id: alert.id });
    res.json({ message: 'Alert deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete alert.' });
  }
});

module.exports = router;
