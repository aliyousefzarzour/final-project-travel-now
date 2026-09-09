const mongoose = require('mongoose');
const Post = require('../models/Post');
const Company = require('../models/Company');
const { send: sendNotification } = require('./notificationController');

const MIN_DAYS = 7;
const MAX_DAYS = 30;

function daysFromNow(dateValue) {
    const targetDate = new Date(dateValue);
    const diffMs = targetDate.getTime() - Date.now();
    return diffMs / (1000 * 60 * 60 * 24);
}

function validateTravelDate(travelDate) {
    if (!travelDate) return 'Travel date is required';
    const diff = daysFromNow(travelDate);
    if (Number.isNaN(diff)) return 'Invalid travel date';
    if (diff < MIN_DAYS || diff > MAX_DAYS) {
        return 'Travel date must be between 7 and 30 days from now';
    }
    return null;
}

function hasInteraction(post) {
    return (post.comments?.length || 0) > 0 || (post.offers?.length || 0) > 0;
}

async function getCompanyRecord(userId) {
    // First try by userId (set after admin approval)
    const byUserId = await Company.findOne({ userId }).catch(() => null);
    if (byUserId) return byUserId;

    // Fallback: look up user email then find company by email
    try {
        const User = require('../models/User');
        const user = await User.findById(userId).catch(() => null);
        if (user?.email) {
            return Company.findOne({ email: user.email }).catch(() => null);
        }
    } catch (_) {}
    return null;
}

function normalizeAttractions(attractions = []) {
    return attractions
        .filter(item => item && (item.name || item.attractionId))
        .map(item => ({
            attractionId: item.attractionId || null,
            name: item.name || ''
        }));
}

exports.create = async (req, res) => {
    try {
        const { destination, budget, travelers, travelDate, requiredText, description = '', attractions = [], status = 'published', sourceType = 'manual', sourceId = null, itinerary, duration, style } = req.body;
        const validationMessage = validateTravelDate(travelDate);
        if (validationMessage) {
            return res.status(400).json({ message: validationMessage });
        }
        if (!requiredText || !String(requiredText).trim()) {
            return res.status(400).json({ message: 'Required text is mandatory' });
        }

        const post = await Post.create({
            userId: req.user.id,
            destination,
            budget,
            travelers,
            travelDate,
            requiredText: String(requiredText).trim(),
            attractions: normalizeAttractions(attractions),
            description,
            status,
            sourceType,
            sourceId: sourceId || null,
            duration: duration || null,
            tripItinerary: Array.isArray(itinerary) ? itinerary : [],
            tripStyle: style || null
        });

        res.status(201).json({ message: 'Post created', post });
    } catch (err) {
        res.status(500).json({ message: 'Post creation failed', error: err.message });
    }
};

exports.createDraft = async (req, res) => {
    req.body.status = 'draft';
    return exports.create(req, res);
};

exports.publishDraft = async (req, res) => {
    try {
        const post = await Post.findOne({ _id: req.params.id, userId: req.user.id }).catch(() => null);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        const validationMessage = validateTravelDate(post.travelDate);
        if (validationMessage) {
            return res.status(400).json({ message: validationMessage });
        }
        post.status = 'published';
        await post.save();
        res.json({ message: 'Post published', post });
    } catch (err) {
        res.status(500).json({ message: 'Publish failed', error: err.message });
    }
};

exports.share = async (req, res) => {
    try {
        const validationMessage = validateTravelDate(req.body.travelDate);
        if (validationMessage) {
            return res.status(400).json({ message: validationMessage });
        }
        const shared = await Post.create({
            userId: req.user.id,
            destination: req.body.destination,
            budget: req.body.budget,
            travelers: req.body.travelers || 1,
            travelDate: req.body.travelDate,
            requiredText: req.body.requiredText || 'Shared from another module',
            description: req.body.description || '',
            attractions: normalizeAttractions(req.body.attractions || []),
            status: 'draft',
            sourceType: 'share',
            sourceId: req.body.sourceId || null
        });
        res.status(201).json({ message: 'Post shared as draft', post: shared });
    } catch (err) {
        res.status(500).json({ message: 'Share failed', error: err.message });
    }
};

exports.getAll = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page || '1', 10), 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit || '10', 10), 1), 50);
        const skip = (page - 1) * limit;

        // Rules:
        // - Admin: sees all posts
        // - Company: sees only published posts (NOT their own drafts)
        // - Tourist: sees only their own posts (published + drafts)
        let baseFilter;
        if (req.user.role === 'admin') {
            baseFilter = {};
        } else if (req.user.role === 'company') {
            // Companies only see published posts — never drafts
            baseFilter = { status: 'published', isActive: true };
        } else {
            // Regular users see only their own posts
            baseFilter = { userId: req.user.id };
        }

        const [posts, total] = await Promise.all([
            Post.find(baseFilter)
                .populate('userId', 'fullName username email role')
                .populate('offers.companyId', 'companyName email')
                .populate('attractions.attractionId', 'name category governorate')
                .sort('-createdAt')
                .skip(skip)
                .limit(limit)
                .catch(() => []),
            Post.countDocuments(baseFilter).catch(() => 0)
        ]);

        res.json({
            posts,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit) || 1
            }
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

exports.getById = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id)
            .populate('userId', 'fullName username email role')
            .populate('offers.companyId', 'companyName email userId')
            .populate('attractions.attractionId', 'name category governorate')
            .catch(() => null);
        if (!post) return res.status(404).json({ message: 'Post not found' });
        if (req.user.role !== 'admin' && req.user.role !== 'company' && String(post.userId?._id || post.userId) !== String(req.user.id)) {
            return res.status(403).json({ message: 'Access denied' });
        }
        res.json({ post });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

exports.update = async (req, res) => {
    try {
        const post = await Post.findOne({ _id: req.params.id, userId: req.user.id }).catch(() => null);
        if (!post) return res.status(404).json({ message: 'Post not found' });
        if (hasInteraction(post)) {
            return res.status(409).json({ message: 'Post can no longer be edited after company interaction' });
        }
        const validationMessage = validateTravelDate(req.body.travelDate || post.travelDate);
        if (validationMessage) {
            return res.status(400).json({ message: validationMessage });
        }
        const updatedFields = ['destination', 'budget', 'travelers', 'travelDate', 'requiredText', 'description', 'status', 'attractions'];
        updatedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                post[field] = field === 'attractions' ? normalizeAttractions(req.body.attractions) : req.body[field];
            }
        });
        await post.save();
        res.json({ message: 'Post updated', post });
    } catch (err) {
        res.status(500).json({ message: 'Update failed', error: err.message });
    }
};

exports.remove = async (req, res) => {
    try {
        const post = req.user.role === 'admin'
            ? await Post.findByIdAndDelete(req.params.id).catch(() => null)
            : await Post.findOneAndDelete({ _id: req.params.id, userId: req.user.id }).catch(() => null);
        if (!post) return res.status(404).json({ message: 'Post not found' });
        res.json({ message: 'Post deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Delete failed', error: err.message });
    }
};

exports.addComment = async (req, res) => {
    try {
        if (req.user.role !== 'company' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Only companies can comment on posts' });
        }
        const post = await Post.findById(req.params.id).catch(() => null);
        if (!post) return res.status(404).json({ message: 'Post not found' });
        if (post.status !== 'published') {
            return res.status(409).json({ message: 'Comments are only allowed on published posts' });
        }

        const text = String(req.body.text || '').trim();
        if (!text) {
            return res.status(400).json({ message: 'Comment text is required' });
        }

        const company = req.user.role === 'company' ? await getCompanyRecord(req.user.id) : null;
        const name = req.user.role === 'admin' ? 'Administrator' : company?.companyName || 'Company';

        post.comments.push({
            userId: req.user.id,
            role: req.user.role,
            name,
            text
        });
        await post.save();

        // Send real-time notification to the post owner
        try {
            const { send: sendNotification } = require('./notificationController');
            await sendNotification(
                post.userId,
                'post',
                `💬 New comment on your trip request`,
                `${name} commented on your "${post.destination}" request: "${text.slice(0, 80)}${text.length > 80 ? '…' : ''}"`,
                `/pages/posts.html?highlight=${post._id}&tab=comments`
            );
        } catch(_) {}

        res.status(201).json({ message: 'Comment added', post });
    } catch (err) {
        res.status(500).json({ message: 'Comment failed', error: err.message });
    }
};

exports.addOffer = async (req, res) => {
    try {
        if (req.user.role !== 'company') {
            return res.status(403).json({ message: 'Only companies can submit offers' });
        }
        const post = await Post.findById(req.params.id).catch(() => null);
        if (!post) return res.status(404).json({ message: 'Post not found' });
        if (post.status !== 'published') {
            return res.status(409).json({ message: 'Offers are only allowed on published posts' });
        }
        const company = await getCompanyRecord(req.user.id);
        if (!company) return res.status(404).json({ message: 'Company profile not found' });

        const offer = {
            companyId: company._id,
            companyName: company.companyName,
            price: Number(req.body.price),
            details: String(req.body.details || '').trim(),
            status: 'pending',
            createdAt: new Date()
        };

        post.offers.push(offer);
        await post.save();

        await sendNotification(
            post.userId,
            'offer',
            'New offer received',
            `${company.companyName} submitted an offer for your post in ${post.destination}.`,
            `/pages/posts.html?id=${post._id}`
        );

        res.status(201).json({ message: 'Offer submitted', post });
    } catch (err) {
        res.status(500).json({ message: 'Offer failed', error: err.message });
    }
};

exports.acceptOffer = async (req, res) => {
    try {
        const post = await Post.findOne({ _id: req.params.id, userId: req.user.id }).catch(() => null);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        const offer = post.offers.id(req.params.offerId);
        if (!offer) return res.status(404).json({ message: 'Offer not found' });
        offer.status = 'accepted';
        offer.acceptedAt = new Date();
        await post.save();

        const company = await Company.findById(offer.companyId).catch(() => null);
        if (company?.userId) {
            await sendNotification(
                company.userId,
                'offer',
                'Offer accepted',
                `Your offer for "${post.destination}" was accepted.`,
                `/pages/company-dashboard.html`
            );
        }

        res.json({ message: 'Offer accepted', post });
    } catch (err) {
        res.status(500).json({ message: 'Accept failed', error: err.message });
    }
};

exports.rejectOffer = async (req, res) => {
    try {
        const post = await Post.findOne({ _id: req.params.id, userId: req.user.id }).catch(() => null);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        const offer = post.offers.id(req.params.offerId);
        if (!offer) return res.status(404).json({ message: 'Offer not found' });
        offer.status = 'rejected';
        await post.save();

        const company = await Company.findById(offer.companyId).catch(() => null);
        if (company?.userId) {
            await sendNotification(
                company.userId,
                'offer',
                'Offer rejected',
                `Your offer for "${post.destination}" was rejected.`,
                `/pages/company-dashboard.html`
            );
        }

        res.json({ message: 'Offer rejected', post });
    } catch (err) {
        res.status(500).json({ message: 'Reject failed', error: err.message });
    }
};

exports.getDrafts = async (req, res) => {
    try {
        const posts = await Post.find({ userId: req.user.id, status: 'draft' }).sort('-createdAt').catch(() => []);
        res.json({ posts });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

exports.closePost = async (req, res) => {
    try {
        const post = await Post.findOne({ _id: req.params.id, userId: req.user.id }).catch(() => null);
        if (!post) return res.status(404).json({ message: 'Post not found' });
        post.marketplaceStatus = 'closed';
        post.isActive = false;
        await post.save();
        res.json({ message: 'Post closed' });
    } catch (err) {
        res.status(500).json({ message: 'Close failed', error: err.message });
    }
};

exports.addProposal = async (req, res) => {
    try {
        if (req.user.role !== 'company') {
            return res.status(403).json({ message: 'Only companies can submit proposals' });
        }
        const post = await Post.findById(req.params.id).catch(() => null);
        if (!post) return res.status(404).json({ message: 'Post not found' });
        // Allow proposals on both published and draft posts
        // (draft posts from trip planner should also receive proposals)

        const company = await getCompanyRecord(req.user.id);
        if (!company) {
            return res.status(404).json({
                message: 'Company profile not found. Make sure your company is registered and approved before sending proposals.'
            });
        }

        // Use company record with fallback to user data
        const companyRecord = {
            _id: company._id,
            companyName: company.companyName || req.user.fullName || req.user.email || 'Company'
        };
        const {
            description, price, attractions = [],
            days, nights, hotelName, hotelRating, transportation,
            mealsIncluded, included, notIncluded,
            specialNotes, offerExpiry, estimatedResponse,
            images, pdfUrl, contactPerson
        } = req.body;

        if (!description || !String(description).trim()) {
            return res.status(400).json({ message: 'Description is required' });
        }
        if (!price || isNaN(Number(price)) || Number(price) <= 0) {
            return res.status(400).json({ message: 'Valid price is required' });
        }

        // Check if company already has a pending proposal on this post
        const existing = (post.proposals || []).find(
            p => String(p.companyId) === String(companyRecord._id) && p.status === 'pending'
        );
        if (existing) {
            return res.status(409).json({ message: 'You already have a pending proposal on this post. Edit or delete it first.' });
        }

        if (!post.proposals) post.proposals = [];
        post.proposals.push({
            companyId:         companyRecord._id,
            companyName:       companyRecord.companyName,
            companyLogo:       company.logo || null,
            companyWhatsApp:   company.whatsapp || company.phone || null,
            contactPerson:     contactPerson || company.ownerName || null,
            verified:          company.verified || false,
            description:       String(description).trim(),
            price:             Number(price),
            currency:          req.body.currency || 'EGP',
            days:              days ? Number(days) : null,
            nights:            nights ? Number(nights) : null,
            hotelName:         hotelName || null,
            hotelRating:       hotelRating ? Number(hotelRating) : null,
            transportation:    transportation || null,
            mealsIncluded:     mealsIncluded || null,
            attractions:       (attractions || []).map(a => ({ name: String(a.name || a).trim() })).filter(a => a.name),
            included:          included || null,
            notIncluded:       notIncluded || null,
            specialNotes:      specialNotes || null,
            offerExpiry:       offerExpiry ? new Date(offerExpiry) : null,
            estimatedResponse: estimatedResponse || null,
            images:            Array.isArray(images) ? images : [],
            pdfUrl:            pdfUrl || null,
            status:            'pending'
        });
        await post.save();

        // Non-fatal notification
        sendNotification(
            post.userId,
            'offer',
            `💼 New offer from ${companyRecord.companyName}`,
            `${companyRecord.companyName} sent a trip proposal for "${post.destination}" — ${Number(price).toLocaleString()} EGP. Tap to view.`,
            `/pages/posts.html?highlight=${post._id}&tab=offers`
        ).catch(() => {});

        // Real-time push
        try {
            const { emitToUser } = require('../services/socketService');
            emitToUser(String(post.userId), 'post_updated', {
                postId: post._id,
                event: 'new_proposal',
                companyName: companyRecord.companyName,
                price: Number(price)
            });
        } catch (_) {}

        // WhatsApp notification to post owner
        try {
            const User = require('../models/User');
            const wa   = require('../services/whatsappService');
            const postOwner = await User.findById(post.userId).select('phone').catch(() => null);
            if (postOwner?.phone) {
                wa.sendProposalNotification(
                    postOwner.phone,
                    companyRecord.companyName,
                    Number(price),
                    post.destination,
                    `http://localhost:5500/pages/posts.html`
                ).catch(() => {});
            }
        } catch (_) {}

        res.status(201).json({ message: 'Proposal submitted successfully' });
    } catch (err) {
        console.error('addProposal error:', err);
        res.status(500).json({ message: 'Proposal failed', error: err.message });
    }
};

exports.updateProposal = async (req, res) => {
    try {
        if (req.user.role !== 'company') {
            return res.status(403).json({ message: 'Only companies can update proposals' });
        }
        const post = await Post.findById(req.params.id).catch(() => null);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        const company = await getCompanyRecord(req.user.id);
        if (!company) return res.status(404).json({ message: 'Company profile not found' });

        const proposal = post.proposals?.id(req.params.proposalId);
        if (!proposal) return res.status(404).json({ message: 'Proposal not found' });
        if (String(proposal.companyId) !== String(company._id)) {
            return res.status(403).json({ message: 'You can only edit your own proposals' });
        }
        if (proposal.status !== 'pending') {
            return res.status(409).json({ message: 'Cannot edit a proposal that has already been approved or rejected' });
        }

        const { description, price, attractions } = req.body;
        if (description) proposal.description = String(description).trim();
        if (price && !isNaN(Number(price))) proposal.price = Number(price);
        if (attractions) {
            proposal.attractions = attractions.map(a => ({ name: String(a.name || a).trim() })).filter(a => a.name);
        }

        await post.save();
        res.json({ message: 'Proposal updated', proposal });
    } catch (err) {
        res.status(500).json({ message: 'Update failed', error: err.message });
    }
};

exports.deleteProposal = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id).catch(() => null);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        const proposal = post.proposals?.id(req.params.proposalId);
        if (!proposal) return res.status(404).json({ message: 'Proposal not found' });

        // Company can delete their own; tourist can delete any proposal on their post
        const company = req.user.role === 'company' ? await getCompanyRecord(req.user.id) : null;
        const isCompanyOwner = company && String(proposal.companyId) === String(company._id);
        const isPostOwner = String(post.userId) === String(req.user.id);

        if (!isCompanyOwner && !isPostOwner && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }

        proposal.deleteOne();
        await post.save();
        res.json({ message: 'Proposal deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Delete failed', error: err.message });
    }
};

exports.approveProposal = async (req, res) => {
    try {
        const post = await Post.findOne({ _id: req.params.id, userId: req.user.id })
            .populate('userId', 'fullName phone email').catch(() => null);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        const proposal = post.proposals?.id(req.params.proposalId);
        if (!proposal) return res.status(404).json({ message: 'Proposal not found' });
        if (proposal.status !== 'pending') {
            return res.status(409).json({ message: 'Proposal already processed' });
        }
        if (post.marketplaceStatus === 'locked' || post.marketplaceStatus === 'closed') {
            return res.status(409).json({ message: 'This post already has an accepted proposal.' });
        }

        // Mark proposal approved, lock post, reject others
        proposal.status = 'approved';
        post.marketplaceStatus = 'locked';
        post.lockedAt = new Date();
        post.acceptedProposalId = proposal._id;
        post.proposals.forEach(p => {
            if (String(p._id) !== String(proposal._id) && p.status === 'pending') {
                p.status = 'rejected';
            }
        });
        await post.save();

        const company = await Company.findById(proposal.companyId).catch(() => null);
        const postOwner = post.userId; // already populated

        // ── Notify company ──
        if (company?.userId) {
            await sendNotification(
                company.userId,
                'offer',
                '🎉 Proposal Accepted! Awaiting Payment',
                `Your trip proposal for "${post.destination}" was accepted. The traveler is proceeding to payment.`,
                `/pages/company-dashboard.html`
            ).catch(() => {});
        }

        // ── Notify traveler ──
        await sendNotification(
            post.userId._id || post.userId,
            'offer',
            '✅ Booking Confirmed — Proceed to Payment',
            `You accepted the proposal from ${proposal.companyName}. Complete payment to confirm your trip.`,
            `/pages/payment.html`
        ).catch(() => {});

        // ── WhatsApp: send company WhatsApp to traveler ──
        try {
            const wa = require('../services/whatsappService');
            const travelerPhone = postOwner?.phone;
            const companyWA     = proposal.companyWhatsApp || company?.whatsapp || company?.phone;

            // Notify company via WhatsApp with traveler's phone
            if (companyWA) {
                wa.sendProposalAccepted(
                    companyWA,
                    proposal.companyName,
                    postOwner?.fullName || 'Traveler',
                    travelerPhone || '',
                    post.destination,
                    proposal.price
                ).catch(() => {});
            }

            // Notify traveler via WhatsApp with company's WhatsApp
            if (travelerPhone && companyWA) {
                const msg = `✅ TravelNow — Booking Accepted!\n\nYou accepted the trip proposal from *${proposal.companyName}*.\n\n📍 Destination: ${post.destination}\n💰 Price: ${Number(proposal.price).toLocaleString()} EGP\n\nContact the company on WhatsApp:\n${companyWA}\n\nTravelNow (+20 127 096 9187)`;
                wa.send && wa.send(travelerPhone, msg).catch(() => {});
            }
        } catch (_) {}

        res.json({
            message: 'Proposal approved',
            proposal: {
                _id:             proposal._id,
                companyId:       proposal.companyId,
                companyName:     proposal.companyName,
                companyWhatsApp: proposal.companyWhatsApp || company?.whatsapp,
                description:     proposal.description,
                price:           proposal.price,
                currency:        proposal.currency || 'EGP',
                days:            proposal.days,
                nights:          proposal.nights,
                hotelName:       proposal.hotelName,
                hotelRating:     proposal.hotelRating,
                transportation:  proposal.transportation,
                mealsIncluded:   proposal.mealsIncluded,
                included:        proposal.included,
                notIncluded:     proposal.notIncluded,
                attractions:     proposal.attractions,
                images:          proposal.images,
                postDestination: post.destination,
                postTravelDate:  post.travelDate,
                postTravelers:   post.travelers,
                travelerPhone:   postOwner?.phone || null,
                travelerEmail:   postOwner?.email || null
            }
        });
    } catch (err) {
        res.status(500).json({ message: 'Approve failed', error: err.message });
    }
};
