import api from './api';

class WhiteboardService {
  /**
   * Create a new whiteboard room
   * @param {string} roomName - Name of the room
   * @param {Object} options - Additional options
   * @param {number} options.limit - Maximum number of users (0 for unlimited)
   * @param {boolean} options.isRecord - Whether to record the session
   * @returns {Promise<Object>} Room information
   */
  async createRoom(roomName, options = {}) {
    try {
      const response = await api.post('/whiteboard/rooms', {
        name: roomName,
        limit: 0,
        isRecord: false,
        ...options
      });
      return response.data;
    } catch (error) {
      console.error('Error creating whiteboard room:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Get a token for accessing a whiteboard room
   * @param {string} roomUuid - Room UUID
   * @param {string} userId - User ID
   * @param {string} role - User role (writer, reader, admin)
   * @returns {Promise<Object>} Token information
   */
  async getRoomToken(roomUuid, userId, role = 'writer') {
    try {
      const response = await api.get(`/whiteboard/rooms/${roomUuid}/token`, {
        params: { userId, role }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting room token:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Convert a document for whiteboard use
   * @param {File} file - The file to convert
   * @param {Object} options - Conversion options
   * @returns {Promise<Object>} Conversion task information
   */
  async convertDocument(file, options = {}) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post('/whiteboard/convert', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        ...options
      });
      
      return response.data;
    } catch (error) {
      console.error('Error converting document:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Get conversion status
   * @param {string} taskUuid - Conversion task UUID
   * @returns {Promise<Object>} Conversion status
   */
  async getConversionStatus(taskUuid) {
    try {
      const response = await api.get(`/whiteboard/convert/status/${taskUuid}`);
      return response.data;
    } catch (error) {
      console.error('Error getting conversion status:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Handle API errors
   * @private
   */
  _handleError(error) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const { status, data } = error.response;
      return new Error(data.message || `Request failed with status ${status}`);
    } else if (error.request) {
      // The request was made but no response was received
      return new Error('No response received from server');
    } else {
      // Something happened in setting up the request that triggered an Error
      return error;
    }
  }
}

export default new WhiteboardService();
