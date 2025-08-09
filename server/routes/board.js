const express = require('express');
const {
    createBoard,
    getBoard,
    saveBoard,
    getBoardsByUser,
    deleteBoard,
    duplicateBoard,
    exportBoardAsImage
} = require('../controllers/boardController');
const router = express.Router();

router.post('/', createBoard);
router.get('/:id', getBoard);
router.put('/:id', saveBoard);
router.get('/', getBoardsByUser); // Get all boards for the logged-in user
router.delete('/:id', deleteBoard);
router.post('/:id/duplicate', duplicateBoard);
router.post('/export/:id', exportBoardAsImage); // For image export (requires frontend canvas data)

module.exports = router;