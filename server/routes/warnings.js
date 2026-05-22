const express = require('express');
const { authenticate } = require('../middleware/auth');
const Farm = require('../models/Farm');

const router = express.Router();
router.use(authenticate);

// GET /api/warnings
// Fetch regional outbreak warnings based on active farm locations or regional data
router.get('/', async (req, res) => {
  try {
    // Get user's farms to find locations
    const farms = await Farm.find({ owner: req.user.id });
    
    // Default region states if no farms are defined
    const activeLocations = farms.length > 0 
      ? [...new Set(farms.map(f => f.location.split(',').pop().trim()))]
      : ['State Region A', 'Tamil Nadu', 'Punjab'];

    // Simulated outbreak warnings database
    const simulatedOutbreaks = [
      {
        id: 'warn-101',
        title: 'Newcastle Disease Outbreak Alert',
        pathogen: 'Avian Paramyxovirus 1',
        type: 'poultry',
        severity: 'critical',
        affectedArea: 'Tamil Nadu',
        coordinates: { lat: 11.1271, lng: 78.6569 },
        radiusKm: 15,
        reportedAt: new Date(Date.now() - 4 * 3600000), // 4 hours ago
        activeCases: 42,
        status: 'active',
        containmentZone: 'Red Zone - Quarantine Active',
        guidelines: [
          'Immediate isolation of all avian flocks',
          'Suspend all external poultry transfers and visitors',
          'Double footbath disinfectants at entrance points',
          'Report any abnormal mortality rates (>1%) instantly'
        ]
      },
      {
        id: 'warn-102',
        title: 'African Swine Fever Warning',
        pathogen: 'Asfarviridae virus',
        type: 'pig',
        severity: 'high',
        affectedArea: 'Punjab',
        coordinates: { lat: 31.1471, lng: 75.3412 },
        radiusKm: 25,
        reportedAt: new Date(Date.now() - 28 * 3600000), // 28 hours ago
        activeCases: 18,
        status: 'active',
        containmentZone: 'Orange Zone - Monitoring',
        guidelines: [
          'Enforce strict perimeter control and fence audits',
          'Boil all kitchen waste / swill feed before swine consumption',
          'Sanitize all incoming vehicles using virucidal sprayers',
          'Avoid contact with wild boar populations near borders'
        ]
      },
      {
        id: 'warn-103',
        title: 'Avian Influenza H5N1 Spike',
        pathogen: 'Highly Pathogenic Influenza A',
        type: 'poultry',
        severity: 'critical',
        affectedArea: 'State Region A',
        coordinates: { lat: 13.0827, lng: 80.2707 },
        radiusKm: 10,
        reportedAt: new Date(Date.now() - 12 * 3600000), // 12 hours ago
        activeCases: 89,
        status: 'active',
        containmentZone: 'Red Zone - Quarantine Active',
        guidelines: [
          'Complete confinement of all poultry indoors',
          'Use protective PPE for all handlers',
          'Establish bird-proofing mesh around ventilation shafts',
          'Enforce 72-hour downtime for personnel traveling between poultry houses'
        ]
      },
      {
        id: 'warn-104',
        title: 'Foot-and-Mouth Disease (FMD) Warning',
        pathogen: 'Aphthovirus',
        type: 'mixed',
        severity: 'medium',
        affectedArea: 'Maharashtra',
        coordinates: { lat: 19.7515, lng: 75.7139 },
        radiusKm: 30,
        reportedAt: new Date(Date.now() - 3 * 86400000), // 3 days ago
        activeCases: 5,
        status: 'monitored',
        containmentZone: 'Yellow Zone - Vigilance',
        guidelines: [
          'Mandatory vaccination boosters for susceptible cattle/sheep',
          'Disinfect all gates, feed troughs, and milk churns daily',
          'Restrict clover and wet pasture grazing activities'
        ]
      }
    ];

    // Filter warnings near the farmer's state/region if applicable
    // Otherwise return all active critical warnings
    const relevantWarnings = simulatedOutbreaks.map(warn => {
      // Determine proximity based on user farms
      const isNearUser = activeLocations.some(loc => 
        warn.affectedArea.toLowerCase().includes(loc.toLowerCase()) ||
        loc.toLowerCase().includes(warn.affectedArea.toLowerCase())
      );
      return { ...warn, isNearFarmer: isNearUser };
    });

    res.json({
      warnings: relevantWarnings,
      lastUpdated: new Date(),
      totalActiveZones: relevantWarnings.filter(w => w.status === 'active').length
    });
  } catch (err) {
    console.error('Fetch warnings error:', err);
    res.status(500).json({ error: 'Failed to retrieve outbreak intelligence warnings.' });
  }
});

module.exports = router;
