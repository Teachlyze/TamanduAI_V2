import { useState, useCallback, useEffect, useRef } from 'react';
import { message } from 'antd';
import { whiteboardService } from '../services/agora/whiteboardService';
import api from '../services/apiSupabase';

/**
 * Custom hook for managing whiteboard state and interactions
 * @param {Object} options - Configuration options
 * @param {string} options.roomId - The ID of the whiteboard room
 * @param {string} options.userId - The ID of the current user
 * @param {string} [options.userName] - The display name of the current user
 * @param {boolean} [options.readonly=false] - Whether the whiteboard is read-only
 * @returns {Object} Whiteboard state and methods
 */
export function useWhiteboard({ roomId, userId, userName, readonly = false }) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [room, setRoom] = useState(null);
  const fastboardApp = useRef(null);

  // Initialize the whiteboard
  const initializeWhiteboard = useCallback(async () => {
    if (!roomId || !userId) {
      setError(new Error('Room ID and User ID are required'));
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Get room token from backend
      const { data } = await api.get(`/whiteboard/rooms/${roomId}/token`, {
        params: { 
          userId,
          role: readonly ? 'reader' : 'writer' 
        }
      });

      // Join the whiteboard room
      const app = await whiteboardService.joinRoom({
        roomToken: data.token,
        roomUuid: data.uuid || roomId,
        userId,
        userName: userName || `User-${String(userId).slice(0, 6)}`,
        callbacks: {
          onPhaseChanged: (phase) => {
            console.log('Whiteboard phase changed:', phase);
            if (phase === 'connected') {
              setIsConnected(true);
            } else if (phase === 'disconnected' || phase === 'reconnecting') {
              setIsConnected(false);
            }
          },
          onRoomStateChanged: (modifyState) => {
            if (modifyState.roomMembers) {
              console.log('Room members updated:', modifyState.roomMembers);
            }
          },
        },
      });

      // Set up event listeners
      const roomInstance = whiteboardService.getRoom();
      if (roomInstance) {
        roomInstance.callbacks.on('onCanUndoStepsUpdate', (canUndoSteps) => {
          setCanUndo(canUndoSteps > 0);
        });
        
        roomInstance.callbacks.on('onCanRedoStepsUpdate', (canRedoSteps) => {
          setCanRedo(canRedoSteps > 0);
        });

        setRoom(roomInstance);
      }

      fastboardApp.current = app;
      return app;
    } catch (err) {
      console.error('Failed to initialize whiteboard:', err);
      setError(err);
      message.error('Failed to load whiteboard. Please try again.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [roomId, userId, userName, readonly]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      const cleanup = async () => {
        try {
          await whiteboardService.leaveRoom();
        } catch (err) {
          console.error('Error cleaning up whiteboard:', err);
        }
      };
      cleanup();
    };
  }, []);

  // Whiteboard actions
  const undo = useCallback(() => {
    if (fastboardApp.current) {
      fastboardApp.current.undo();
    }
  }, []);

  const redo = useCallback(() => {
    if (fastboardApp.current) {
      fastboardApp.current.redo();
    }
  }, []);

  const clear = useCallback(() => {
    if (fastboardApp.current) {
      fastboardApp.current.cleanCurrentScene();
    }
  }, []);

  const save = useCallback(async () => {
    if (!fastboardApp.current) return null;
    
    try {
      // In a real implementation, you would save the whiteboard content
      // This could involve taking a screenshot or saving the whiteboard state
      const snapshot = await fastboardApp.current.getSceneSnapshot();
      return snapshot;
    } catch (err) {
      console.error('Failed to save whiteboard:', err);
      message.error('Failed to save whiteboard');
      throw err;
    }
  }, []);

  const mount = useCallback((container) => {
    if (!container) return;
    try {
      whiteboardService.mount(container);
    } catch (err) {
      console.error('Failed to mount whiteboard:', err);
      setError(err);
    }
  }, []);

  return {
    // State
    isLoading,
    error,
    canUndo,
    canRedo,
    isConnected,
    room,
    fastboardApp: fastboardApp.current,
    
    // Methods
    initialize: initializeWhiteboard,
    mount,
    undo,
    redo,
    clear,
    save,
  };
}

export default useWhiteboard;
