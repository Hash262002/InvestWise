const ImportModel = require('../models/Import');
const Portfolio = require('../models/Portfolio');

// Create new import (CSV parsed JSON)
const createImport = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, description, originalFileName, data, portfolioId } = req.body;

    if (!name || !data || !Array.isArray(data)) {
      return res.status(400).json({ status: 'error', message: 'Name and data array are required' });
    }

    // Optional: verify portfolio ownership if provided
    if (portfolioId) {
      const portfolio = await Portfolio.findById(portfolioId);
      if (!portfolio) return res.status(404).json({ status: 'error', message: 'Portfolio not found' });
      if (portfolio.user.toString() !== userId.toString()) return res.status(403).json({ status: 'error', message: 'Not authorized for this portfolio' });
    }

    const imp = new ImportModel({
      user: userId,
      name,
      description,
      originalFileName,
      data,
    });

    await imp.save();

    res.status(201).json({ status: 'success', data: { id: imp._id } });
  } catch (err) {
    console.error('createImport error', err);
    res.status(500).json({ status: 'error', message: 'Failed to create import', error: err.message });
  }
};

// List imports for user
const listImports = async (req, res) => {
  try {
    const userId = req.user.userId;
    const imports = await ImportModel.find({ user: userId }).select('name description originalFileName createdAt updatedAt');
    res.status(200).json({ status: 'success', data: imports });
  } catch (err) {
    console.error('listImports error', err);
    res.status(500).json({ status: 'error', message: 'Failed to list imports', error: err.message });
  }
};

// Get single import
const getImport = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const imp = await ImportModel.findById(id);
    if (!imp) return res.status(404).json({ status: 'error', message: 'Import not found' });
    if (imp.user.toString() !== userId.toString()) return res.status(403).json({ status: 'error', message: 'Not authorized' });
    res.status(200).json({ status: 'success', data: imp });
  } catch (err) {
    console.error('getImport error', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch import', error: err.message });
  }
};

// Update import (replace data or metadata)
const updateImport = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { name, description, data } = req.body;
    const imp = await ImportModel.findById(id);
    if (!imp) return res.status(404).json({ status: 'error', message: 'Import not found' });
    if (imp.user.toString() !== userId.toString()) return res.status(403).json({ status: 'error', message: 'Not authorized' });

    if (name) imp.name = name;
    if (description) imp.description = description;
    if (data && Array.isArray(data)) imp.data = data;

    await imp.save();
    res.status(200).json({ status: 'success', data: { id: imp._id } });
  } catch (err) {
    console.error('updateImport error', err);
    res.status(500).json({ status: 'error', message: 'Failed to update import', error: err.message });
  }
};

// Delete import
const deleteImport = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const imp = await ImportModel.findById(id);
    if (!imp) return res.status(404).json({ status: 'error', message: 'Import not found' });
    if (imp.user.toString() !== userId.toString()) return res.status(403).json({ status: 'error', message: 'Not authorized' });
    await ImportModel.findByIdAndDelete(id);
    res.status(200).json({ status: 'success', message: 'Import deleted' });
  } catch (err) {
    console.error('deleteImport error', err);
    res.status(500).json({ status: 'error', message: 'Failed to delete import', error: err.message });
  }
};

module.exports = {
  createImport,
  listImports,
  getImport,
  updateImport,
  deleteImport,
};
