const Board = require('../models/Board');

// @desc    Create a new board
// @route   POST /api/boards
// @access  Private
const createBoard = async (req, res) => {
    try {
        const { name } = req.body;
        const newBoard = new Board({
            userId: req.user.id, // User ID from JWT payload
            name: name || 'Untitled Board',
            elements: []
        });
        const savedBoard = await newBoard.save();
        res.status(201).json(savedBoard);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get a specific board by ID
// @route   GET /api/boards/:id
// @access  Private
const getBoard = async (req, res) => {
    try {
        const board = await Board.findById(req.params.id);
        if (!board) {
            return res.status(404).json({ message: 'Board not found' });
        }
        // Ensure only the owner or collaborators can access (basic check)
        if (board.userId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to access this board' });
        }
        res.json(board);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Save board data
// @route   PUT /api/boards/:id
// @access  Private
const saveBoard = async (req, res) => {
    try {
        const { elements } = req.body;
        const board = await Board.findById(req.params.id);

        if (!board) {
            return res.status(404).json({ message: 'Board not found' });
        }
        if (board.userId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to save this board' });
        }

        board.elements = elements;
        board.updatedAt = Date.now();
        const updatedBoard = await board.save();
        res.json(updatedBoard);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all boards for the authenticated user
// @route   GET /api/boards/
// @access  Private
const getBoardsByUser = async (req, res) => {
    try {
        const boards = await Board.find({ userId: req.user.id }).sort({ updatedAt: -1 });
        res.json(boards);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a board
// @route   DELETE /api/boards/:id
// @access  Private
const deleteBoard = async (req, res) => {
    try {
        const board = await Board.findById(req.params.id);

        if (!board) {
            return res.status(404).json({ message: 'Board not found' });
        }
        if (board.userId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to delete this board' });
        }

        await Board.deleteOne({ _id: req.params.id }); // Use deleteOne for Mongoose 6+
        res.json({ message: 'Board removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Duplicate a board
// @route   POST /api/boards/:id/duplicate
// @access  Private
const duplicateBoard = async (req, res) => {
    try {
        const originalBoard = await Board.findById(req.params.id);

        if (!originalBoard) {
            return res.status(404).json({ message: 'Board not found' });
        }
        if (originalBoard.userId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to duplicate this board' });
        }

        const duplicatedBoard = new Board({
            userId: req.user.id,
            name: `Copy of ${originalBoard.name}`,
            elements: JSON.parse(JSON.stringify(originalBoard.elements)) // Deep copy
        });
        const savedDuplicatedBoard = await duplicatedBoard.save();
        res.status(201).json(savedDuplicatedBoard);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Export board to image (requires frontend to send base64 data)
// @route   POST /api/boards/export/:id
// @access  Private
const exportBoardAsImage = async (req, res) => {
    try {
        const { imageData } = req.body; // Base64 image data from frontend
        const boardId = req.params.id;

        if (!imageData) {
            return res.status(400).json({ message: 'No image data provided' });
        }

        // You might want to save this image to a cloud storage like S3 or just send it back
        // For simplicity, we'll just acknowledge receipt.
        // In a real app, you'd save it and return a URL.

        // Example: Save to local file (for demonstration)
        const fs = require('fs');
        const path = require('path');
        const base64Data = imageData.replace(/^data:image\/png;base64,/, "");
        const filename = `board-${boardId}-${Date.now()}.png`;
        const filePath = path.join(__dirname, '../exports', filename); // Create an 'exports' folder

        if (!fs.existsSync(path.join(__dirname, '../exports'))){
            fs.mkdirSync(path.join(__dirname, '../exports'));
        }

        fs.writeFile(filePath, base64Data, 'base64', (err) => {
            if (err) {
                console.error('Error saving image:', err);
                return res.status(500).json({ message: 'Failed to export image' });
            }
            res.json({ message: 'Board exported successfully', filename: filename });
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


module.exports = {
    createBoard,
    getBoard,
    saveBoard,
    getBoardsByUser,
    deleteBoard,
    duplicateBoard,
    exportBoardAsImage
};