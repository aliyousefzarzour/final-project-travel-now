// =================== YALA PLAN CONTROLLER ===================
const TripPlan = require('../models/TripPlan');

// Attractions per style
const ATTRACTIONS_BY_STYLE = {
    historical: ['Pyramids of Giza', 'Egyptian Museum', 'Khan El Khalili', 'Citadel of Saladin', 'Luxor Temple', 'Karnak Temple', 'Valley of the Kings', 'Abu Simbel', 'Bibliotheca Alexandrina', 'Temple of Hatshepsut', 'Colossi of Memnon', 'Edfu Temple', 'Kom Ombo Temple'],
    adventure:  ['White Desert Safari', 'Siwa Oasis', 'Dahab Blue Hole', 'Hurghada Diving', 'Mount Sinai Climb', 'Colored Canyon', 'Ras Mohammed Snorkeling', 'ATV Desert Safari', 'Wadi Rum'],
    luxury:     ['5-star Nile Cruise', 'Old Cataract Hotel Aswan', 'Sofitel Legend Old Cataract', 'Marriott Mena House', 'Four Seasons Nile Plaza', 'Kempinski Nile Hotel', 'Private Desert Camp'],
    family:     ['Grand Egyptian Museum', 'Pyramids Sound & Light', 'Pharaonic Village', 'Aqua Park Hurghada', 'Cairo Tower', 'Dolphin World Hurghada', 'Sindbad Aqua Park'],
    religious:  ['Al-Azhar Mosque', 'Hanging Church', "St. Catherine's Monastery", 'Mount Sinai', 'Coptic Cairo', 'Ben Ezra Synagogue', 'Sultan Hassan Mosque', 'Ibn Tulun Mosque'],
    beach:      ['Sharm El Sheikh Naama Bay', 'Hurghada Beach', 'Dahab Lagoon', 'Marsa Alam Reef', 'North Coast', 'Ain Sokhna', 'Taba Beach']
};

// Attractions by destination keyword
const DEST_ATTRACTIONS = {
    'cairo':        ['Egyptian Museum', 'Khan El Khalili', 'Citadel of Saladin', 'Cairo Tower', 'Coptic Cairo', 'Sultan Hassan Mosque', 'Al-Azhar Mosque', 'Hanging Church'],
    'giza':         ['Pyramids of Giza', 'Sphinx', 'Sound & Light Show', 'Solar Boat Museum', 'Grand Egyptian Museum'],
    'luxor':        ['Luxor Temple', 'Karnak Temple', 'Valley of the Kings', 'Colossi of Memnon', 'Temple of Hatshepsut', 'Luxor Museum'],
    'aswan':        ['Abu Simbel', 'Philae Temple', 'Old Cataract Hotel', 'Nubian Village', 'Elephantine Island', 'Kom Ombo Temple'],
    'sharm':        ['Naama Bay Beach', 'Ras Mohammed National Park', 'Shark Bay Snorkeling', 'Old Market Sharm', 'Tiran Island Diving'],
    'hurghada':     ['Hurghada Beach', 'Giftun Island Snorkeling', 'Aqua Park', 'Dolphin World', 'Mahmya Beach', 'Underwater Museum'],
    'dahab':        ['Blue Hole Diving', 'Dahab Lagoon', 'Bedouin Market', 'Canyon Snorkeling', 'Lighthouse Reef'],
    'siwa':         ['Siwa Oasis', 'Temple of Amun', 'Cleopatra Spring', 'Salt Lakes', 'Great Sand Sea Safari'],
    'alexandria':   ['Bibliotheca Alexandrina', 'Qaitbay Citadel', 'Montaza Palace', 'Roman Amphitheater', 'Stanley Bridge'],
    'nile':         ['Nile Cruise', 'Felucca Ride Aswan', 'Sunset Nile Dinner Cruise', 'Luxor-Aswan Cruise'],
    'sinai':        ["St. Catherine's Monastery", 'Mount Sinai', 'Colored Canyon', 'Dahab', 'Taba'],
    'marsa':        ['Marsa Alam Reef', 'Abu Dabbab Bay', 'Wadi El Gemal Park', 'Dolphin House'],
    'fayoum':       ['Wadi El Rayan', 'Whale Valley', 'Qarun Lake', 'Pottery Village'],
    'north coast':  ['North Coast Beach', 'Marina El Alamein', 'El Alamein Memorial', 'Sidi Abdel Rahman Beach']
};

/**
 * Get attractions for a destination string (fuzzy match).
 */
function getAttractionsForDest(dest) {
    const d = dest.toLowerCase();
    for (const [key, list] of Object.entries(DEST_ATTRACTIONS)) {
        if (d.includes(key) || key.includes(d.split(' ')[0])) return [...list];
    }
    return null;
}

/**
 * Build a multi-destination itinerary.
 * Each destination gets ≈ Math.ceil(days / dests.length) days.
 */
const generateItineraryLogic = ({ budget, travelers, days, style, destinations, destTags = [] }) => {
    const dailyBudget = Math.floor(budget / days);
    const hotel = dailyBudget > 3000 ? '5-star luxury hotel' : '4-star comfortable hotel';

    // Parse destinations
    const dests = destTags.length
        ? destTags
        : (destinations || '').split(',').map(d => d.trim()).filter(Boolean);

    const styleAttractions = ATTRACTIONS_BY_STYLE[style] || ATTRACTIONS_BY_STYLE.historical;

    // Build attraction pool per destination
    // If destinations specified, weight pool toward those
    const itinerary = [];

    if (dests.length === 0) {
        // No destinations — use style attractions only
        for (let i = 0; i < days; i++) {
            itinerary.push({
                day: i + 1,
                morning:       `Visit ${styleAttractions[i % styleAttractions.length]} (3–4 hrs with guide)`,
                afternoon:     `${styleAttractions[(i + 1) % styleAttractions.length]} + authentic local lunch`,
                evening:       'Traditional dinner & cultural entertainment',
                accommodation: hotel
            });
        }
    } else {
        // Distribute days across destinations
        const daysPerDest = dests.map((_, idx) => {
            if (idx === dests.length - 1) return days - Math.floor(days / dests.length) * idx;
            return Math.floor(days / dests.length);
        });

        let dayNum = 1;
        dests.forEach((dest, dIdx) => {
            const destDays = daysPerDest[dIdx];
            const pool = getAttractionsForDest(dest) || styleAttractions;
            for (let d = 0; d < destDays; d++) {
                const morning   = pool[d % pool.length];
                const afternoon = pool[(d + 1) % pool.length] !== morning
                    ? pool[(d + 1) % pool.length]
                    : pool[(d + 2) % pool.length];
                itinerary.push({
                    day: dayNum++,
                    destination: dest,
                    morning:   `Explore ${morning} (guided tour, 3–4 hrs)`,
                    afternoon: `${afternoon} + local cuisine lunch`,
                    evening:   d === 0 && dIdx > 0
                        ? `Arrive in ${dest} — check-in & welcome dinner`
                        : 'Dinner at a local restaurant & evening stroll',
                    accommodation: `${hotel} — ${dest}`
                });
            }
        });
    }

    return {
        itinerary,
        estimatedCost: budget,
        perPerson: Math.floor(budget / travelers),
        destinations: dests
    };
};

// Generate and save trip plan
exports.generate = async (req, res) => {
    try {
        const { budget, travelers, days, style, destinations, destTags } = req.body;
        if (!budget || !travelers || !days || !style) {
            return res.status(400).json({ message: 'Budget, travelers, days, and style are required' });
        }

        const result = generateItineraryLogic({
            budget: Number(budget),
            travelers: Number(travelers),
            days: Number(days),
            style,
            destinations: destinations || '',
            destTags: Array.isArray(destTags) ? destTags : []
        });

        // Save to DB
        const tripPlan = await TripPlan.create({
            userId: req.user.id,
            budget: Number(budget),
            travelers: Number(travelers),
            days: Number(days),
            style,
            destinations: Array.isArray(destTags) && destTags.length ? destTags.join(', ') : (destinations || ''),
            itinerary: result.itinerary,
            estimatedCost: result.estimatedCost
        });

        res.json({
            message: 'Yala Plan generated!',
            tripPlan: {
                id: tripPlan._id,
                ...result
            }
        });
    } catch (err) {
        console.error('Yala Plan error:', err);
        res.status(500).json({ message: 'Trip plan generation failed', error: err.message });
    }
};

// Get user's saved trips
exports.getMyTrips = async (req, res) => {
    try {
        const trips = await TripPlan.find({ userId: req.user.id }).sort('-createdAt').catch(() => []);
        res.json({ trips });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Get single trip plan by ID
exports.getById = async (req, res) => {
    try {
        const trip = await TripPlan.findById(req.params.id).catch(() => null);
        if (!trip) return res.status(404).json({ message: 'Trip plan not found' });
        // Allow owner or admin only
        if (String(trip.userId) !== String(req.user.id) && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }
        res.json({ trip });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};
