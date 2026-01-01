import { db, auth } from './firebaseConfig';
import {
    collection,
    addDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    doc,
    query,
    where,
    orderBy,
    Timestamp,
    writeBatch
} from 'firebase/firestore';

export interface StoredNotification {
    id?: string;
    userId: string;
    type: 'feed' | 'sleep' | 'medication' | 'reminder' | 'achievement';
    title: string;
    message: string;
    timestamp: Date;
    isRead: boolean;
    isUrgent?: boolean;
}

class NotificationStorageService {
    private collectionName = 'notifications';

    /**
     * Save a new notification to Firebase
     */
    async saveNotification(notification: Omit<StoredNotification, 'id'>): Promise<string | null> {
        try {
            const docRef = await addDoc(collection(db, this.collectionName), {
                ...notification,
                timestamp: Timestamp.fromDate(notification.timestamp),
            });
            return docRef.id;
        } catch (error) {
            if (__DEV__) console.log('Failed to save notification:', error);
            return null;
        }
    }

    /**
     * Get all notifications for current user
     */
    async getNotifications(): Promise<StoredNotification[]> {
        const userId = auth.currentUser?.uid;
        if (!userId) return [];

        try {
            const q = query(
                collection(db, this.collectionName),
                where('userId', '==', userId),
                orderBy('timestamp', 'desc')
            );

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    userId: data.userId,
                    type: data.type,
                    title: data.title,
                    message: data.message,
                    timestamp: data.timestamp instanceof Timestamp
                        ? data.timestamp.toDate()
                        : new Date(data.timestamp),
                    isRead: data.isRead,
                    isUrgent: data.isUrgent,
                };
            });
        } catch (error) {
            if (__DEV__) console.log('Failed to get notifications:', error);
            return [];
        }
    }

    /**
     * Get unread count
     */
    async getUnreadCount(): Promise<number> {
        const userId = auth.currentUser?.uid;
        if (!userId) return 0;

        try {
            const q = query(
                collection(db, this.collectionName),
                where('userId', '==', userId),
                where('isRead', '==', false)
            );

            const snapshot = await getDocs(q);
            return snapshot.size;
        } catch (error) {
            if (__DEV__) console.log('Failed to get unread count:', error);
            return 0;
        }
    }

    /**
     * Mark a notification as read
     */
    async markAsRead(notificationId: string): Promise<void> {
        try {
            await updateDoc(doc(db, this.collectionName, notificationId), {
                isRead: true,
            });
        } catch (error) {
            if (__DEV__) console.log('Failed to mark as read:', error);
        }
    }

    /**
     * Mark all notifications as read for current user
     */
    async markAllAsRead(): Promise<void> {
        const userId = auth.currentUser?.uid;
        if (!userId) return;

        try {
            const q = query(
                collection(db, this.collectionName),
                where('userId', '==', userId),
                where('isRead', '==', false)
            );

            const snapshot = await getDocs(q);
            const batch = writeBatch(db);

            snapshot.docs.forEach(doc => {
                batch.update(doc.ref, { isRead: true });
            });

            await batch.commit();
        } catch (error) {
            if (__DEV__) console.log('Failed to mark all as read:', error);
        }
    }

    /**
     * Delete a specific notification
     */
    async deleteNotification(notificationId: string): Promise<void> {
        try {
            await deleteDoc(doc(db, this.collectionName, notificationId));
        } catch (error) {
            if (__DEV__) console.log('Failed to delete notification:', error);
        }
    }

    /**
     * Clear all notifications for current user
     */
    async clearAll(): Promise<void> {
        const userId = auth.currentUser?.uid;
        if (!userId) return;

        try {
            const q = query(
                collection(db, this.collectionName),
                where('userId', '==', userId)
            );

            const snapshot = await getDocs(q);
            const batch = writeBatch(db);

            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });

            await batch.commit();
        } catch (error) {
            if (__DEV__) console.log('Failed to clear all notifications:', error);
        }
    }

    /**
     * Send notification to a specific user (for guest expiry, etc.)
     */
    async sendNotificationToUser(
        userId: string,
        type: StoredNotification['type'] | 'guest_access_ended',
        title: string,
        message: string
    ): Promise<string | null> {
        try {
            const docRef = await addDoc(collection(db, this.collectionName), {
                userId,
                type,
                title,
                message,
                timestamp: Timestamp.fromDate(new Date()),
                isRead: false,
            });
            return docRef.id;
        } catch (error) {
            if (__DEV__) console.log('Failed to send notification to user:', error);
            return null;
        }
    }
}

export const notificationStorageService = new NotificationStorageService();
export default notificationStorageService;

