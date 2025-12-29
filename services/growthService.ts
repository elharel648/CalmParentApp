/**
 * Growth Measurement Service
 * Handles historical growth data (weight, height, head circumference)
 */
import { db, auth } from './firebaseConfig';
import {
    collection,
    addDoc,
    query,
    where,
    getDocs,
    orderBy,
    limit,
    Timestamp,
    deleteDoc,
    updateDoc,
    doc,
} from 'firebase/firestore';

export interface GrowthMeasurement {
    id?: string;
    babyId: string;
    date: Timestamp;
    weight?: number;      // kg
    height?: number;      // cm
    headCircumference?: number; // cm
    notes?: string;
    createdAt: Timestamp;
    createdBy: string;
}

const COLLECTION_NAME = 'growthMeasurements';

/**
 * Add a new growth measurement
 */
export const addGrowthMeasurement = async (
    babyId: string,
    data: {
        weight?: number;
        height?: number;
        headCircumference?: number;
        date?: Date | Timestamp;
        notes?: string;
    }
): Promise<string | null> => {
    const user = auth.currentUser;
    if (!user || !babyId) return null;

    try {
        // Handle date conversion - if it's already a Timestamp, use it; otherwise convert from Date
        let dateTimestamp: Timestamp;
        if (data.date instanceof Timestamp) {
            dateTimestamp = data.date;
        } else if (data.date instanceof Date) {
            dateTimestamp = Timestamp.fromDate(data.date);
        } else {
            dateTimestamp = Timestamp.now();
        }

        const measurement: Omit<GrowthMeasurement, 'id'> = {
            babyId,
            date: dateTimestamp,
            createdAt: Timestamp.now(),
            createdBy: user.uid,
            ...(data.weight !== undefined && { weight: data.weight }),
            ...(data.height !== undefined && { height: data.height }),
            ...(data.headCircumference !== undefined && { headCircumference: data.headCircumference }),
            ...(data.notes && { notes: data.notes }),
        };

        const docRef = await addDoc(collection(db, COLLECTION_NAME), measurement);
        return docRef.id;
    } catch (error) {
        console.error('Error adding growth measurement:', error);
        return null;
    }
};

/**
 * Get all measurements for a baby, ordered by date descending
 */
export const getGrowthMeasurements = async (
    babyId: string,
    options?: {
        fromDate?: Date;
        toDate?: Date;
        limitCount?: number;
    }
): Promise<GrowthMeasurement[]> => {
    if (!babyId) return [];

    try {
        let q = query(
            collection(db, COLLECTION_NAME),
            where('babyId', '==', babyId),
            orderBy('date', 'desc')
        );

        if (options?.limitCount) {
            q = query(q, limit(options.limitCount));
        }

        const snapshot = await getDocs(q);
        const measurements: GrowthMeasurement[] = [];

        snapshot.forEach((doc) => {
            const data = doc.data();
            const measurement: GrowthMeasurement = {
                id: doc.id,
                babyId: data.babyId,
                date: data.date,
                weight: data.weight,
                height: data.height,
                headCircumference: data.headCircumference,
                notes: data.notes,
                createdAt: data.createdAt,
                createdBy: data.createdBy,
            };

            // Filter by date range if specified
            if (options?.fromDate || options?.toDate) {
                const measurementDate = data.date.toDate();
                if (options.fromDate && measurementDate < options.fromDate) return;
                if (options.toDate && measurementDate > options.toDate) return;
            }

            measurements.push(measurement);
        });

        return measurements;
    } catch (error) {
        console.error('Error getting growth measurements:', error);
        return [];
    }
};

/**
 * Get the latest measurement for a baby
 */
export const getLatestMeasurement = async (
    babyId: string
): Promise<GrowthMeasurement | null> => {
    const measurements = await getGrowthMeasurements(babyId, { limitCount: 1 });
    return measurements.length > 0 ? measurements[0] : null;
};

/**
 * Get the previous measurement (before the latest)
 */
export const getPreviousMeasurement = async (
    babyId: string
): Promise<GrowthMeasurement | null> => {
    const measurements = await getGrowthMeasurements(babyId, { limitCount: 2 });
    return measurements.length > 1 ? measurements[1] : null;
};

/**
 * Calculate change between latest and previous measurement
 */
export const getGrowthChange = async (
    babyId: string
): Promise<{
    weight?: number;
    height?: number;
    headCircumference?: number;
    daysBetween: number;
} | null> => {
    const measurements = await getGrowthMeasurements(babyId, { limitCount: 2 });

    if (measurements.length < 2) return null;

    const latest = measurements[0];
    const previous = measurements[1];

    const latestDate = latest.date.toDate();
    const previousDate = previous.date.toDate();
    const daysBetween = Math.round(
        (latestDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
        weight: latest.weight !== undefined && previous.weight !== undefined
            ? Math.round((latest.weight - previous.weight) * 100) / 100
            : undefined,
        height: latest.height !== undefined && previous.height !== undefined
            ? Math.round((latest.height - previous.height) * 10) / 10
            : undefined,
        headCircumference: latest.headCircumference !== undefined && previous.headCircumference !== undefined
            ? Math.round((latest.headCircumference - previous.headCircumference) * 10) / 10
            : undefined,
        daysBetween,
    };
};

/**
 * Delete a measurement
 */
export const deleteGrowthMeasurement = async (measurementId: string): Promise<boolean> => {
    try {
        await deleteDoc(doc(db, COLLECTION_NAME, measurementId));
        return true;
    } catch (error) {
        console.error('Error deleting growth measurement:', error);
        return false;
    }
};

/**
 * Update an existing measurement
 */
export const updateGrowthMeasurement = async (
    measurementId: string,
    data: {
        weight?: number;
        height?: number;
        headCircumference?: number;
        notes?: string;
        date?: Timestamp;
    }
): Promise<boolean> => {
    try {
        const updateData: Record<string, any> = {};
        if (data.weight !== undefined) updateData.weight = data.weight;
        if (data.height !== undefined) updateData.height = data.height;
        if (data.headCircumference !== undefined) updateData.headCircumference = data.headCircumference;
        if (data.notes !== undefined) updateData.notes = data.notes;
        if (data.date !== undefined) updateData.date = data.date;

        await updateDoc(doc(db, COLLECTION_NAME, measurementId), updateData);
        return true;
    } catch (error) {
        console.error('Error updating growth measurement:', error);
        return false;
    }
};

/**
 * Get measurements for chart display (last N measurements, oldest first)
 */
export const getMeasurementsForChart = async (
    babyId: string,
    count: number = 6
): Promise<GrowthMeasurement[]> => {
    const measurements = await getGrowthMeasurements(babyId, { limitCount: count });
    return measurements.reverse(); // Oldest first for chart
};
