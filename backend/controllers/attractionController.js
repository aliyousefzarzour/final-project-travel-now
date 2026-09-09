const Attraction = require('../models/Attraction');

function escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

exports.getAll = async (req, res) => {
    try {
        const { category, governorate, search, sort } = req.query;
        const query = { isActive: true };

        if (category) query.category = new RegExp(`^${escapeRegex(String(category).trim())}$`, 'i');
        if (governorate) query.governorate = new RegExp(`^${escapeRegex(String(governorate).trim())}$`, 'i');
        if (search) query.name = { $regex: escapeRegex(String(search).trim()).slice(0, 100), $options: 'i' };

        let attractions = await Attraction.find(query).sort('-createdAt').catch(() => []);

        if (sort === 'rating') attractions = attractions.sort((a, b) => b.rating - a.rating);
        if (sort === 'reviews') attractions = attractions.sort((a, b) => b.reviews - a.reviews);
        if (sort === 'name') attractions = attractions.sort((a, b) => a.name.localeCompare(b.name));

        res.json({ count: attractions.length, attractions });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

exports.getById = async (req, res) => {
    try {
        const attraction = await Attraction.findById(req.params.id).catch(() => null);
        if (!attraction) return res.status(404).json({ message: 'Not found' });
        res.json({ attraction });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

exports.create = async (req, res) => {
    try {
        const attraction = await Attraction.create(req.body);
        res.status(201).json({ attraction });
    } catch (err) {
        res.status(500).json({ message: 'Creation failed', error: err.message });
    }
};

exports.update = async (req, res) => {
    try {
        const attraction = await Attraction.findByIdAndUpdate(req.params.id, req.body, { new: true }).catch(() => null);
        if (!attraction) return res.status(404).json({ message: 'Not found' });
        res.json({ attraction });
    } catch (err) {
        res.status(500).json({ message: 'Update failed', error: err.message });
    }
};

exports.delete = async (req, res) => {
    try {
        const attraction = await Attraction.findByIdAndDelete(req.params.id).catch(() => null);
        if (!attraction) return res.status(404).json({ message: 'Not found' });
        res.json({ message: 'Attraction deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Delete failed', error: err.message });
    }
};
