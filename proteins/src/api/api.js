import axios from 'axios';

export const fetchMoleculeData = async (structureId) => {
  try {
    const id = structureId.toUpperCase();

    // Ligands are always 3 characters (letters or digits)
    if (/^[A-Z0-9]{3}$/.test(id)) {
      // Prefer downloadable ligand SDF with coordinates (idealized conformer)
      // Example: https://files.rcsb.org/ligands/download/001_ideal.sdf
      const sdfResponse = await axios.get(
        `https://files.rcsb.org/ligands/download/${id}_ideal.sdf`,
        { responseType: 'text' }
      );
      return { data: sdfResponse.data, format: 'sdf' };
    } else if (/^[A-Z0-9]{4}$/.test(id)) {
      // Download PDB text so the in-WebView parser can render atoms
      const pdbResponse = await axios.get(
        `https://files.rcsb.org/download/${id}.pdb`,
        { responseType: 'text' }
      );
      return { data: pdbResponse.data, format: 'pdb' };
    } else {
      throw new Error('Invalid structureId format');
    }
  } catch (error) {
    throw error;
  }
};
