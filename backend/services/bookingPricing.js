const Attraction = require('../models/Attraction');
const Offer = require('../models/Offer');
const Post = require('../models/Post');
const User = require('../models/User');

function calculatePayableAmount(basePrice, travelers) {
    const subtotal = Number(basePrice) * Number(travelers);
    if (!Number.isFinite(subtotal) || subtotal < 0) return null;
    return Math.round(subtotal + Math.round(subtotal * 0.14) + 100);
}

async function getTrustedBookingPrice(booking, userId) {
    let basePrice;
    if (booking.type === 'offer') {
        const offer = await Offer.findOne({ _id: booking.offerId, isActive: true });
        if (!offer || (offer.bookingDeadline && offer.bookingDeadline < new Date())) {
            throw new Error('The offer is no longer available');
        }
        basePrice = offer.price;
    } else if (booking.type === 'proposal') {
        const post = await Post.findOne({
            _id: booking.proposalPostId,
            userId,
            marketplaceStatus: 'locked',
            acceptedProposalId: booking.proposalId
        });
        const proposal = post?.proposals?.id(booking.proposalId);
        if (
            !proposal ||
            proposal.status !== 'approved' ||
            (proposal.offerExpiry && proposal.offerExpiry < new Date())
        ) {
            throw new Error('The approved proposal is no longer available');
        }
        if (proposal.currency !== 'EGP') throw new Error('Only EGP proposals can be paid');
        basePrice = proposal.price;
    } else if (booking.type === 'attraction') {
        const attraction = await Attraction.findOne({ _id: booking.attractionId, isActive: true });
        const user = await User.findById(userId).select('country');
        if (!attraction || !user) throw new Error('The attraction booking is no longer available');
        basePrice = String(user.country || '').trim().toLowerCase() === 'egypt'
            ? attraction.prices.egyptian
            : attraction.prices.foreigner;
    } else {
        throw new Error('This booking type cannot be paid');
    }

    const amount = calculatePayableAmount(basePrice, booking.travelers || 1);
    if (amount === null) throw new Error('The booking has no valid payable amount');
    return { amount, currency: 'EGP' };
}

module.exports = { calculatePayableAmount, getTrustedBookingPrice };
