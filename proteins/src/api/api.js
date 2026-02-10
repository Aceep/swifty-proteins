import axios from 'axios';

const API_BASE_URL = 'https://data.rcsb.org/rest/v1/core/entry';

export const fetchMoleculeData = async (structureId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/${structureId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching molecule data:', error);
    throw error;
  }
};