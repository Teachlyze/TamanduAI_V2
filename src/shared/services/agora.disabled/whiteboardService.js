import { WhiteWebSdk, DeviceType, AnimationMode } from 'white-web-sdk';
import { createFastboard, createUI, FastboardApp } from '@netless/fastboard';

export class WhiteboardService {
  constructor() {
    this.sdk = null;
    this.room = null;
    this.fastboardApp = null;
    this.appId = import.meta.env.VITE_AGORA_WHITEBOARD_APP_ID || import.meta.env.VITE_AGORA_APP_ID;
    this.region = 'us-sv'; // Default region, can be configured
  }

  /**
   * Initialize the whiteboard SDK
   * @param {string} appId - Agora App ID
   * @param {string} region - Region code (default: 'us-sv')
   */
  async initSDK(appId = this.appId, region = this.region) {
    if (this.sdk) return this.sdk;
    
    this.sdk = new WhiteWebSdk({
      appIdentifier: appId,
      region: region,
      useMobXState: true,
      deviceType: this.getDeviceType(),
    });
    
    return this.sdk;
  }

  /**
   * Join a whiteboard room
   * @param {Object} params - Join parameters
   * @param {string} params.roomToken - Room token from Agora
   * @param {string} params.roomUuid - Room UUID
   * @param {string} params.userId - User ID
   * @param {string} [params.userName] - User display name
   * @param {Object} [params.callbacks] - Room callbacks
   * @returns {Promise<FastboardApp>} Fastboard app instance
   */
  async joinRoom({
    roomToken,
    roomUuid,
    userId,
    userName = `User-${userId.slice(0, 6)}`,
    callbacks = {}
  }) {
    if (!this.sdk) {
      await this.initSDK();
    }

    try {
      this.fastboardApp = await createFastboard({
        sdkConfig: {
          appIdentifier: this.appId,
          region: this.region,
        },
        joinRoom: {
          uuid: roomUuid,
          roomToken: roomToken,
          uid: userId,
          userPayload: {
            uid: userId,
            nickName: userName,
            avatar: '',
          },
          isWritable: true,
          disableDeviceInputs: false,
          disableBezier: false,
          disableEraseImage: false,
          disableNewPencil: false,
          floatBar: true,
          ...callbacks,
        },
      });

      return this.fastboardApp;
    } catch (error) {
      console.error('Failed to join whiteboard room:', error);
      throw new Error(`Failed to join whiteboard room: ${error.message}`);
    }
  }

  /**
   * Leave the current whiteboard room
   */
  async leaveRoom() {
    if (this.fastboardApp) {
      try {
        await this.fastboardApp.destroy();
        this.fastboardApp = null;
        this.room = null;
      } catch (error) {
        console.error('Error leaving whiteboard room:', error);
      }
    }
  }

  /**
   * Mount the whiteboard to a DOM element
   * @param {HTMLElement} container - The container element
   */
  mount(container) {
    if (!this.fastboardApp) {
      throw new Error('Must join a room before mounting');
    }
    
    const ui = createUI(this.fastboardApp, container, {
      // UI configuration
      containerSizeRatio: 16 / 9, // 16:9 aspect ratio
      components: {
        // Customize UI components here
      },
    });
    
    return ui;
  }

  /**
   * Get the current room instance
   * @returns {Object} The room instance
   */
  getRoom() {
    return this.fastboardApp?.room;
  }

  /**
   * Get the current fastboard app instance
   * @returns {FastboardApp} The fastboard app instance
   */
  getFastboardApp() {
    return this.fastboardApp;
  }

  /**
   * Determine device type
   * @private
   */
  getDeviceType() {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('mobile') || userAgent.includes('android') || userAgent.includes('iphone')) {
      return DeviceType.Touch;
    }
    return DeviceType.Surface;
  }
}

// Export as a singleton
export const whiteboardService = new WhiteboardService();

export default whiteboardService;
