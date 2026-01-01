import { collection, doc, deleteDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';

export interface UndoableAction {
    eventId: string;
    type: 'create' | 'update' | 'delete';
    data?: any;
    timestamp: Date;
}

class UndoService {
    private lastAction: UndoableAction | null = null;
    private undoTimeout: NodeJS.Timeout | null = null;

    setLastAction(action: UndoableAction) {
        this.lastAction = action;
        // Auto clear after 5 seconds
        if (this.undoTimeout) {
            clearTimeout(this.undoTimeout);
        }
        this.undoTimeout = setTimeout(() => {
            this.lastAction = null;
        }, 5000);
    }

    getLastAction(): UndoableAction | null {
        return this.lastAction;
    }

    async undo(): Promise<boolean> {
        if (!this.lastAction) return false;

        try {
            if (this.lastAction.type === 'create') {
                // Delete the created event
                const eventRef = doc(db, 'events', this.lastAction.eventId);
                await deleteDoc(eventRef);
            } else if (this.lastAction.type === 'delete') {
                // Recreate the deleted event (would need to store full data)
                // For now, we only support undo for create
            }

            this.lastAction = null;
            if (this.undoTimeout) {
                clearTimeout(this.undoTimeout);
            }
            return true;
        } catch (error) {
            console.error('Undo failed:', error);
            return false;
        }
    }

    clear() {
        this.lastAction = null;
        if (this.undoTimeout) {
            clearTimeout(this.undoTimeout);
        }
    }
}

export const undoService = new UndoService();

