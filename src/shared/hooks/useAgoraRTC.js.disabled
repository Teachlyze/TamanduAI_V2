import { useState, useEffect, useRef, useCallback } from 'react';
import { agoraService } from '@/services/agoraService';

export const APP_ID = 'C2RSMGZWEfCkNc9kyA0nVw/y2iAQJUULwmNlA';

// Custom hook for Agora RTC
const useAgoraRTC = () => {
  const [users, setUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [remoteUsers, setRemoteUsers] = useState({});
  const [error, setError] = useState(null);
  
  const localTracks = useRef({
    audioTrack: null,
    videoTrack: null,
    screenTrack: null
  });

  // Join a channel
  const join = useCallback(async (channelName, userId, role, userData) => {
    try {
      // Initialize RTC client
      await agoraService.initRTCClient();
      
      // Initialize RTM client for signaling
      await agoraService.initRTMClient(userId);
      
      // Join the channel
      const { audioTrack, videoTrack } = await agoraService.joinChannel(
        channelName,
        null, // token
        userId
      );
      
      // Store local tracks
      localTracks.current.audioTrack = audioTrack;
      localTracks.current.videoTrack = videoTrack;
      
      // Set initial states
      setIsConnected(true);
      setIsMuted(false);
      setIsVideoOff(false);
      
      // Setup event listeners
      agoraService.setupRemoteUserHandlers(
        // onUserPublished
        (user, mediaType) => {
          setUsers(prevUsers => {
            const userExists = prevUsers.some(u => u.uid === user.uid);
            if (!userExists) {
              return [...prevUsers, { ...user, mediaType }];
            }
            return prevUsers.map(u => 
              u.uid === user.uid 
                ? { ...u, [mediaType === 'video' ? 'hasVideo' : 'hasAudio']: true }
                : u
            );
          });
        },
        // onUserUnpublished
        (user, mediaType) => {
          setUsers(prevUsers => {
            if (mediaType === 'video') {
              return prevUsers.filter(u => u.uid !== user.uid);
            }
            return prevUsers.map(u => 
              u.uid === user.uid 
                ? { ...u, [mediaType === 'video' ? 'hasVideo' : 'hasAudio']: false }
                : u
            );
          });
        }
      );
      
      return { audioTrack, videoTrack };
    } catch (err) {
      console.error('Failed to join channel:', err);
      setError(err);
      throw err;
    }
  }, []);

  // Leave the channel
  const leave = useCallback(async () => {
    try {
      await agoraService.leaveChannel();
      setIsConnected(false);
      setUsers([]);
      setRemoteUsers({});
      localTracks.current = { audioTrack: null, videoTrack: null, screenTrack: null };
    } catch (err) {
      console.error('Error leaving channel:', err);
      setError(err);
      throw err;
    }
  }, []);

  // Start screen sharing
  const startScreenShare = useCallback(async () => {
    try {
      const screenTrack = await agoraService.startScreenShare();
      localTracks.current.screenTrack = screenTrack;
      setIsSharingScreen(true);
      return screenTrack;
    } catch (err) {
      console.error('Failed to start screen share:', err);
      setError(err);
      throw err;
    }
  }, []);

  // Stop screen sharing
  const stopScreenShare = useCallback(async () => {
    try {
      await agoraService.stopScreenShare();
      localTracks.current.screenTrack = null;
      setIsSharingScreen(false);
    } catch (err) {
      console.error('Failed to stop screen share:', err);
      setError(err);
      throw err;
    }
  }, []);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (localTracks.current.audioTrack) {
      localTracks.current.audioTrack.setEnabled(!isMuted);
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localTracks.current.videoTrack) {
      localTracks.current.videoTrack.setEnabled(!isVideoOff);
      setIsVideoOff(!isVideoOff);
    }
  }, [isVideoOff]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isConnected) {
        leave().catch(console.error);
      }
    };
  }, [isConnected, leave]);

  return {
    // State
    users,
    isConnected,
    isMuted,
    isVideoOff,
    isSharingScreen,
    remoteUsers,
    error,
    
    // Refs
    localAudioTrack: localTracks.current.audioTrack,
    localVideoTrack: localTracks.current.videoTrack,
    screenTrack: localTracks.current.screenTrack,
    
    // Methods
    join,
    leave,
    startScreenShare,
    stopScreenShare,
    toggleAudio,
    toggleVideo,
    
    // For backward compatibility
    startCall: join,
    leaveCall: leave,
    joinState: isConnected,
    screenShareClient: null // Not used with the new service
  };
  
  // Toggle screen sharing
  const toggleScreenShare = useCallback(async () => {
    if (isSharingScreen) {
      await stopScreenSharing();
    } else {
      await startScreenSharing();
    }
  }, [isSharingScreen]);
  
  // Start screen sharing
  const startScreenSharing = useCallback(async () => {
    if (isSharingScreen) return;
    
    try {
      // Create a new client for screen sharing
      screenShareClient.current = createClient({ mode: 'rtc', codec: 'vp8' });
      
      // Get screen sharing stream
      const screenTrack = await AgoraRTC.createScreenVideoTrack({
        encoderConfig: '1080p_1',
        optimizationMode: 'detail',
      }, 'disable');
      
      // Join with a different UID for screen sharing
      const uid = await screenShareClient.current.join(
        APP_ID,
        channelName,
        screenShareToken.current,
        null
      );
      
      // Publish screen track
      await screenShareClient.current.publish(screenTrack);
      
      // Store the screen track
      tracksRef.current[1] = screenTrack;
      setIsSharingScreen(true);
      
      // Handle screen track ended event
      screenTrack.on('track-ended', async () => {
        await stopScreenSharing();
      });
      
      console.log('Screen sharing started');
    } catch (err) {
      console.error('Failed to start screen sharing:', err);
      setError(err);
      await stopScreenSharing();
    }
  }, [channelName, isSharingScreen]);
  
  // Stop screen sharing
  const stopScreenSharing = useCallback(async () => {
    if (!isSharingScreen) return;
    
    try {
      if (screenShareClient.current) {
        await screenShareClient.current.leave();
        screenShareClient.current = null;
      }
      
      // Restore camera track if available
      if (tracksRef.current?.[1] && tracks?.[1]) {
        await client.publish(tracks[1]);
        tracksRef.current[1] = tracks[1];
      }
      
      setIsSharingScreen(false);
      console.log('Screen sharing stopped');
    } catch (err) {
      console.error('Error stopping screen sharing:', err);
      setError(err);
    }
  }, [client, isSharingScreen, tracks]);

  return {
    client,
    ready,
    tracks: tracksRef.current,
    users: Object.values(remoteUsers),
    isConnected,
    isMuted,
    isVideoOff,
    isSharingScreen,
    error: error || tracksError,
    startCall,
    leaveCall,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
  };
};

export default useAgoraRTC;
