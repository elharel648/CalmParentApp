/**
 * Babysitter Service - פונקציות ניהול בייביסיטרים
 */

import {
    collection,
    query,
    where,
    orderBy,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp,
    onSnapshot,
    getDoc,
    Timestamp,
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { BabysitterBooking, Review, ActiveShift, Chat, ChatMessage } from '../types/babysitter';

// ===================
// BOOKINGS
// ===================

/**
 * Get all bookings for a parent
 */
export async function getParentBookings(parentId: string): Promise<BabysitterBooking[]> {
    const q = query(
        collection(db, 'bookings'),
        where('parentId', '==', parentId),
        orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BabysitterBooking));
}

/**
 * Get all bookings for a babysitter
 */
export async function getBabysitterBookings(babysitterId: string): Promise<BabysitterBooking[]> {
    const q = query(
        collection(db, 'bookings'),
        where('babysitterId', '==', babysitterId),
        orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BabysitterBooking));
}

/**
 * Update booking status
 */
export async function updateBookingStatus(
    bookingId: string,
    status: BabysitterBooking['status']
): Promise<void> {
    await updateDoc(doc(db, 'bookings', bookingId), {
        status,
        updatedAt: serverTimestamp(),
    });
}

/**
 * Accept a booking (for babysitter)
 */
export async function acceptBooking(bookingId: string): Promise<void> {
    await updateBookingStatus(bookingId, 'confirmed');
}

/**
 * Decline a booking (for babysitter)
 */
export async function declineBooking(bookingId: string): Promise<void> {
    await updateBookingStatus(bookingId, 'declined');
}

/**
 * Start a shift - create active shift record
 */
export async function startShift(booking: BabysitterBooking, babysitterName: string): Promise<string> {
    const shiftRef = await addDoc(collection(db, 'activeShifts'), {
        bookingId: booking.id,
        parentId: booking.parentId,
        babysitterId: booking.babysitterId,
        babysitterName,
        startedAt: serverTimestamp(),
        isPaused: false,
        totalPausedSeconds: 0,
        hourlyRate: booking.hourlyRate,
        isActive: true,
    });

    // Update booking status
    await updateDoc(doc(db, 'bookings', booking.id), {
        status: 'active',
        actualStart: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });

    return shiftRef.id;
}

/**
 * Get active shift for parent
 */
export async function getActiveShift(parentId: string): Promise<ActiveShift | null> {
    const q = query(
        collection(db, 'activeShifts'),
        where('parentId', '==', parentId),
        where('isActive', '==', true)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as ActiveShift;
}

/**
 * Subscribe to active shift updates
 */
export function subscribeToActiveShift(
    parentId: string,
    callback: (shift: ActiveShift | null) => void
): () => void {
    const q = query(
        collection(db, 'activeShifts'),
        where('parentId', '==', parentId),
        where('isActive', '==', true)
    );

    return onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            callback(null);
        } else {
            const doc = snapshot.docs[0];
            callback({ id: doc.id, ...doc.data() } as ActiveShift);
        }
    });
}

// ===================
// REVIEWS
// ===================

/**
 * Get reviews for a babysitter
 */
export async function getBabysitterReviews(babysitterId: string): Promise<Review[]> {
    const q = query(
        collection(db, 'reviews'),
        where('babysitterId', '==', babysitterId),
        orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
}

/**
 * Calculate average rating for babysitter
 */
export async function getBabysitterRating(babysitterId: string): Promise<{ average: number; count: number }> {
    const reviews = await getBabysitterReviews(babysitterId);

    if (reviews.length === 0) {
        return { average: 0, count: 0 };
    }

    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    return {
        average: Math.round((sum / reviews.length) * 10) / 10,
        count: reviews.length,
    };
}

// ===================
// CHAT
// ===================

/**
 * Get or create chat between parent and babysitter
 */
export async function getOrCreateChat(parentId: string, babysitterId: string): Promise<Chat> {
    // Check if chat exists
    const q = query(
        collection(db, 'chats'),
        where('parentId', '==', parentId),
        where('babysitterId', '==', babysitterId)
    );

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() } as Chat;
    }

    // Create new chat
    const chatRef = await addDoc(collection(db, 'chats'), {
        parentId,
        babysitterId,
        unreadByParent: 0,
        unreadByBabysitter: 0,
        createdAt: serverTimestamp(),
    });

    return {
        id: chatRef.id,
        parentId,
        babysitterId,
        unreadByParent: 0,
        unreadByBabysitter: 0,
        createdAt: Timestamp.now(),
    };
}

/**
 * Send message in chat
 */
export async function sendMessage(chatId: string, senderId: string, text: string): Promise<void> {
    // Add message
    await addDoc(collection(db, 'chats', chatId, 'messages'), {
        chatId,
        senderId,
        text,
        createdAt: serverTimestamp(),
    });

    // Update chat with last message
    const chatDoc = await getDoc(doc(db, 'chats', chatId));
    const chatData = chatDoc.data();

    const isParent = senderId === chatData?.parentId;

    await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: text,
        lastMessageAt: serverTimestamp(),
        // Increment unread for the other party
        ...(isParent
            ? { unreadByBabysitter: (chatData?.unreadByBabysitter || 0) + 1 }
            : { unreadByParent: (chatData?.unreadByParent || 0) + 1 }
        ),
    });
}

/**
 * Get chat messages
 */
export async function getChatMessages(chatId: string): Promise<ChatMessage[]> {
    const q = query(
        collection(db, 'chats', chatId, 'messages'),
        orderBy('createdAt', 'asc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
}

/**
 * Subscribe to chat messages
 */
export function subscribeToChatMessages(
    chatId: string,
    callback: (messages: ChatMessage[]) => void
): () => void {
    const q = query(
        collection(db, 'chats', chatId, 'messages'),
        orderBy('createdAt', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
        callback(messages);
    });
}

/**
 * Mark chat as read
 */
export async function markChatAsRead(chatId: string, userId: string): Promise<void> {
    const chatDoc = await getDoc(doc(db, 'chats', chatId));
    const chatData = chatDoc.data();

    const isParent = userId === chatData?.parentId;

    await updateDoc(doc(db, 'chats', chatId), {
        ...(isParent ? { unreadByParent: 0 } : { unreadByBabysitter: 0 }),
    });
}

// ===================
// BABYSITTER PROFILE
// ===================

/**
 * Get babysitter stats
 */
export async function getBabysitterStats(babysitterId: string): Promise<{
    completedShifts: number;
    repeatFamilies: number;
    avgResponseTime: number;
}> {
    // Get completed bookings
    const bookingsQuery = query(
        collection(db, 'bookings'),
        where('babysitterId', '==', babysitterId),
        where('status', '==', 'completed')
    );
    const bookingsSnapshot = await getDocs(bookingsQuery);
    const completedShifts = bookingsSnapshot.size;

    // Count unique parents who booked 2+ times
    const parentCounts: Record<string, number> = {};
    bookingsSnapshot.docs.forEach(doc => {
        const parentId = doc.data().parentId;
        parentCounts[parentId] = (parentCounts[parentId] || 0) + 1;
    });
    const repeatFamilies = Object.values(parentCounts).filter(count => count >= 2).length;

    // TODO: Calculate actual response time from pending->confirmed timestamps
    const avgResponseTime = 5; // Placeholder

    return {
        completedShifts,
        repeatFamilies,
        avgResponseTime,
    };
}
