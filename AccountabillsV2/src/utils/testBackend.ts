const API_BASE_URL = 'http://localhost:3001/api';

export const testBackendConnection = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);

    if (response.ok) {
      const data = await response.json();
      console.log('Backend health check passed:', data);
      return true;
    } else {
      console.error('Backend health check failed with status:', response.status);
      return false;
    }
  } catch (error) {
    console.error('Backend connection error - make sure the backend server is running on port 3001:', error);
    return false;
  }
};
