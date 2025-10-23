const { RtcTokenBuilder, RtcRole } = require('agora-token');

class TokenService {
  constructor() {
    this.appId = process.env.REACT_APP_AGORA_APP_ID;
    this.appCertificate = process.env.REACT_APP_AGORA_APP_CERTIFICATE;
    
    if (!this.appId || !this.appCertificate) {
      console.warn('Agora App ID or Certificate not found in environment variables');
    }
  }

  generateRtcToken(channelName, uid, role = RtcRole.PUBLISHER, expireTime = 3600) {
    if (!this.appId || !this.appCertificate) {
      throw new Error('Agora credentials not configured');
    }

    const currentTime = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTime + expireTime;

    return RtcTokenBuilder.buildTokenWithUid(
      this.appId,
      this.appCertificate,
      channelName,
      uid,
      role,
      privilegeExpiredTs
    ).toString();
  }

  generateWhiteboardToken(roomUuid, userId, role = 'writer', lifespan = 3600) {
    if (!this.appId || !this.appCertificate) {
      throw new Error('Agora credentials not configured');
    }

    const payload = {
      ak: this.appId,
      roomUuid,
      uid: userId,
      role,
      expireTime: Date.now() + lifespan * 1000
    };
    
    return {
      token: `WHITEBOARD_${Buffer.from(JSON.stringify(payload)).toString('base64')}`,
      expireTime: payload.expireTime
    };
  }
}

module.exports = new TokenService();
