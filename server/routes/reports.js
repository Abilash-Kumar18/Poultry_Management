const express = require('express');
const Farm = require('../models/Farm');
const Visitor = require('../models/Visitor');
const DiseaseAlert = require('../models/DiseaseAlert');
const BiosecurityChecklist = require('../models/BiosecurityChecklist');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/reports/compliance
router.get('/compliance', async (req, res) => {
  try {
    const { farm_id } = req.query;
    const farmsFilter = farm_id ? { _id: farm_id } : {};
    const farms = await Farm.find(farmsFilter).sort({ name: 1 });
    
    const farmCompliance = await Promise.all(farms.map(async (f) => {
      const totalChecks = await BiosecurityChecklist.countDocuments({ farm_id: f.id });
      const completedChecks = await BiosecurityChecklist.countDocuments({ farm_id: f.id, status: 'completed' });
      
      const fJson = f.toJSON();
      fJson.total_checks = totalChecks;
      fJson.completed_checks = completedChecks;
      fJson.compliance_rate = totalChecks > 0 ? Math.round((completedChecks / totalChecks) * 100) : 0;
      return fJson;
    }));
    
    farmCompliance.sort((a, b) => b.compliance_rate - a.compliance_rate);

    // Category breakdown
    const categoryFilter = farm_id ? { farm_id } : {};
    const categoryBreakdown = {
      daily: { total: 0, completed: 0 },
      weekly: { total: 0, completed: 0 },
      monthly: { total: 0, completed: 0 }
    };
    
    const allChecks = await BiosecurityChecklist.find(categoryFilter);
    allChecks.forEach(c => {
      if (categoryBreakdown[c.category]) {
        categoryBreakdown[c.category].total += 1;
        if (c.status === 'completed') {
          categoryBreakdown[c.category].completed += 1;
        }
      }
    });

    const avgResult = await Farm.aggregate([
      { $match: farm_id ? { _id: new require('mongoose').Types.ObjectId(farm_id) } : {} },
      { $group: { _id: null, avgScore: { $avg: '$biosecurity_score' } } }
    ]).catch(() => []);
    
    const overallScore = avgResult.length > 0 ? Math.round(avgResult[0].avgScore) : 0;

    res.json({
      report: {
        title: 'Biosecurity Compliance Report',
        generated_at: new Date().toISOString(),
        overall_score: overallScore,
        farm_compliance: farmCompliance,
        category_breakdown: Object.entries(categoryBreakdown).map(([name, data]) => ({ category: name, ...data })),
      }
    });
  } catch (err) {
    console.error('Compliance report error:', err);
    res.status(500).json({ error: 'Failed to generate compliance report.' });
  }
});

// GET /api/reports/visitors
router.get('/visitors', async (req, res) => {
  try {
    const { farm_id } = req.query;
    const filter = farm_id ? { farm_id } : {};
    
    const total = await Visitor.countDocuments(filter);
    const approved = await Visitor.countDocuments({ ...filter, status: 'approved' });
    const rejected = await Visitor.countDocuments({ ...filter, status: 'rejected' });
    const pending = await Visitor.countDocuments({ ...filter, status: 'pending' });
    const completed = await Visitor.countDocuments({ ...filter, status: 'completed' });
    
    const summary = { total, approved, rejected, pending, completed };

    const allFarms = await Farm.find({});
    const byFarm = await Promise.all(allFarms.map(async (f) => {
      const count = await Visitor.countDocuments({ farm_id: f.id });
      return {
        farm_name: f.name,
        type: f.type,
        visitor_count: count
      };
    }));
    byFarm.sort((a, b) => b.visitor_count - a.visitor_count);

    const mongoose = require('mongoose');
    const byPurpose = await Visitor.aggregate([
      { $match: farm_id ? { farm_id: new mongoose.Types.ObjectId(farm_id) } : {} },
      { $group: { _id: '$purpose', count: { $sum: 1 } } },
      { $project: { purpose: '$_id', count: 1, _id: 0 } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]).catch(() => []);

    // Daily trend last 30 days
    const dailyTrend = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      const dayCount = await Visitor.countDocuments({
        ...filter,
        visit_date: { $regex: `^${dateStr}` }
      });
      dailyTrend.push({ date: dateStr, count: dayCount });
    }

    res.json({
      report: {
        title: 'Visitor Analytics Report',
        generated_at: new Date().toISOString(),
        summary,
        by_farm: byFarm,
        by_purpose: byPurpose,
        daily_trend: dailyTrend.filter(d => d.count > 0),
      }
    });
  } catch (err) {
    console.error('Visitor report error:', err);
    res.status(500).json({ error: 'Failed to generate visitor report.' });
  }
});

// GET /api/reports/diseases
router.get('/diseases', async (req, res) => {
  try {
    const { farm_id } = req.query;
    const filter = farm_id ? { farm_id } : {};
    
    const total = await DiseaseAlert.countDocuments(filter);
    const critical = await DiseaseAlert.countDocuments({ ...filter, severity: 'critical' });
    const high = await DiseaseAlert.countDocuments({ ...filter, severity: 'high' });
    const medium = await DiseaseAlert.countDocuments({ ...filter, severity: 'medium' });
    const low = await DiseaseAlert.countDocuments({ ...filter, severity: 'low' });
    
    const active = await DiseaseAlert.countDocuments({ ...filter, status: 'active' });
    const resolved = await DiseaseAlert.countDocuments({ ...filter, status: 'resolved' });

    const mongoose = require('mongoose');
    const affectedResult = await DiseaseAlert.aggregate([
      { $match: farm_id ? { farm_id: new mongoose.Types.ObjectId(farm_id) } : {} },
      { $group: { _id: null, total: { $sum: '$affected_animals' } } }
    ]).catch(() => []);
    const totalAffected = affectedResult.length > 0 ? affectedResult[0].total : 0;

    const summary = {
      total,
      critical,
      high,
      medium,
      low,
      active,
      resolved,
      total_affected: totalAffected
    };

    const allFarms = await Farm.find({});
    const byFarm = await Promise.all(allFarms.map(async (f) => {
      const alertCount = await DiseaseAlert.countDocuments({ farm_id: f.id });
      const severeCount = await DiseaseAlert.countDocuments({ farm_id: f.id, severity: { $in: ['critical', 'high'] } });
      
      const affectedRes = await DiseaseAlert.aggregate([
        { $match: { farm_id: f._id } },
        { $group: { _id: null, total: { $sum: '$affected_animals' } } }
      ]).catch(() => []);
      const totalAffectedAnimals = affectedRes.length > 0 ? affectedRes[0].total : 0;

      return {
        farm_name: f.name,
        type: f.type,
        alert_count: alertCount,
        total_affected: totalAffectedAnimals,
        severe_count: severeCount
      };
    }));
    byFarm.sort((a, b) => b.alert_count - a.alert_count);

    const recentAlertsRaw = await DiseaseAlert.find(filter)
      .populate('farm_id', 'name')
      .sort({ created_at: -1 })
      .limit(20);
      
    const recentAlerts = recentAlertsRaw.map(a => {
      const aJson = a.toJSON();
      if (a.farm_id) {
        aJson.farm_name = a.farm_id.name;
        aJson.farm_id = a.farm_id.id;
      } else {
        aJson.farm_name = 'Unknown Farm';
      }
      return aJson;
    });

    res.json({
      report: {
        title: 'Disease Incident Summary',
        generated_at: new Date().toISOString(),
        summary,
        by_farm: byFarm,
        recent_alerts: recentAlerts,
      }
    });
  } catch (err) {
    console.error('Disease report error:', err);
    res.status(500).json({ error: 'Failed to generate disease report.' });
  }
});

module.exports = router;
