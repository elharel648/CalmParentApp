import { db, auth } from './firebaseConfig';
import { Timestamp, updateDoc, doc, arrayUnion, arrayRemove } from 'firebase/firestore';

/**
 * New Firebase functions for enhanced profile features
 */

// ============================================
// Growth Tracking Functions
// ============================================

export const addGrowthMeasurement = async (babyId: string, measurement: {
    weight?: number;
    height?: number;
    headCircumference?: number;
    note?: string;
    date?: Date;
}) => {
    if (!babyId) return;
    const babyRef = doc(db, 'babies', babyId);
    const newMeasurement = {
        id: Date.now().toString(),
        date: Timestamp.fromDate(measurement.date || new Date()),
        weight: measurement.weight,
        height: measurement.height,
        headCircumference: measurement.headCircumference,
        note: measurement.note,
    };

    const updates: any = {
        growthHistory: arrayUnion(newMeasurement),
    };

    // Update latest stats
    if (measurement.weight) updates['stats.weight'] = measurement.weight.toString();
    if (measurement.height) updates['stats.height'] = measurement.height.toString();
    if (measurement.headCircumference) updates['stats.headCircumference'] = measurement.headCircumference.toString();

    await updateDoc(babyRef, updates);
};

export const deleteGrowthMeasurement = async (babyId: string, measurementId: string, allMeasurements: any[]) => {
    if (!babyId) return;
    const babyRef = doc(db, 'babies', babyId);
    const measurementToRemove = allMeasurements.find((m: any) => m.id === measurementId);
    if (measurementToRemove) {
        await updateDoc(babyRef, {
            growthHistory: arrayRemove(measurementToRemove)
        });
    }
};

// ============================================
// Categorized Milestones Functions
// ============================================

export const addCategorizedMilestone = async (babyId: string, milestone: {
    category: 'motor' | 'communication' | 'cognitive' | 'social' | 'other';
    title: string;
    expectedAgeMonths?: number;
    note?: string;
}) => {
    if (!babyId) return;
    const babyRef = doc(db, 'babies', babyId);
    const newMilestone = {
        id: Date.now().toString(),
        category: milestone.category,
        title: milestone.title,
        expectedAgeMonths: milestone.expectedAgeMonths,
        isAchieved: false,
        note: milestone.note,
    };
    await updateDoc(babyRef, {
        categorizedMilestones: arrayUnion(newMilestone)
    });
};

export const toggleCategorizedMilestone = async (
    babyId: string,
    milestoneId: string,
    allMilestones: any[]
) => {
    if (!babyId) return;
    const babyRef = doc(db, 'babies', babyId);

    const milestone = allMilestones.find((m: any) => m.id === milestoneId);
    if (!milestone) return;

    // Remove old version
    await updateDoc(babyRef, {
        categorizedMilestones: arrayRemove(milestone)
    });

    // Add updated version
    const updated = {
        ...milestone,
        isAchieved: !milestone.isAchieved,
        achievedDate: !milestone.isAchieved ? Timestamp.now() : null,
    };
    await updateDoc(babyRef, {
        categorizedMilestones: arrayUnion(updated)
    });
};

export const deleteCategorizedMilestone = async (
    babyId: string,
    milestoneId: string,
    allMilestones: any[]
) => {
    if (!babyId) return;
    const babyRef = doc(db, 'babies', babyId);
    const milestoneToRemove = allMilestones.find((m: any) => m.id === milestoneId);
    if (milestoneToRemove) {
        await updateDoc(babyRef, {
            categorizedMilestones: arrayRemove(milestoneToRemove)
        });
    }
};

// ============================================
// Photo Gallery Functions
// ============================================

export const addPhotoToGallery = async (babyId: string, photo: {
    url: string;
    caption?: string;
    date?: Date;
}) => {
    if (!babyId) return;
    const babyRef = doc(db, 'babies', babyId);
    const newPhoto = {
        id: Date.now().toString(),
        url: photo.url,
        date: Timestamp.fromDate(photo.date || new Date()),
        caption: photo.caption,
    };
    await updateDoc(babyRef, {
        photoGallery: arrayUnion(newPhoto)
    });
};

export const deletePhotoFromGallery = async (
    babyId: string,
    photoId: string,
    allPhotos: any[]
) => {
    if (!babyId) return;
    const babyRef = doc(db, 'babies', babyId);
    const photoToRemove = allPhotos.find((p: any) => p.id === photoId);
    if (photoToRemove) {
        await updateDoc(babyRef, {
            photoGallery: arrayRemove(photoToRemove)
        });
    }
};

// ============================================
// Basic Info Update
// ============================================

export const updateBabyBasicInfo = async (babyId: string, data: {
    name?: string;
    gender?: 'boy' | 'girl' | 'other';
    birthDate?: Date;
}) => {
    if (!babyId) return;
    const babyRef = doc(db, 'babies', babyId);
    const updates: any = {};
    if (data.name) updates.name = data.name;
    if (data.gender) updates.gender = data.gender;
    if (data.birthDate) updates.birthDate = Timestamp.fromDate(data.birthDate);
    await updateDoc(babyRef, updates);
};
