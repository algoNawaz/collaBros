import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

function HomePage() {
  const { user, logout } = useAuth();
  const [boards, setBoards] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBoards = async () => {
      try {
        const config = {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        };
        const res = await axios.get('http://localhost:5000/api/boards', config);
        setBoards(res.data);
      } catch (error) {
        console.error('Error fetching boards:', error.response ? error.response.data.message : error.message);
      }
    };

    if (user) {
      fetchBoards();
    }
  }, [user]);

  const handleCreateBoard = async () => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
      };
      const res = await axios.post('http://localhost:5000/api/boards', { name: 'New Board' }, config);
      navigate(`/board/${res.data._id}`);
    } catch (error) {
      console.error('Error creating board:', error.response ? error.response.data.message : error.message);
    }
  };

  const handleDeleteBoard = async (boardId) => {
    if (window.confirm('Are you sure you want to delete this board?')) {
      try {
        const config = {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        };
        await axios.delete(`http://localhost:5000/api/boards/${boardId}`, config);
        setBoards(boards.filter((board) => board._id !== boardId));
      } catch (error) {
        console.error('Error deleting board:', error.response ? error.response.data.message : error.message);
      }
    }
  };

  const handleDuplicateBoard = async (boardId) => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
      };
      const res = await axios.post(`http://localhost:5000/api/boards/${boardId}/duplicate`, {}, config);
      navigate(`/board/${res.data._id}`); // Navigate to the duplicated board
    } catch (error) {
      console.error('Error duplicating board:', error.response ? error.response.data.message : error.message);
    }
  };

  return (
    <div className="home-page">
      <div className="board-list-container">
        <h1>Welcome, {user?.username}!</h1>
        <button onClick={handleCreateBoard}>Create New Board</button>
        <button onClick={logout} style={{ marginLeft: '10px' }}>Logout</button>

        <h2>Your Boards</h2>
        {boards.length === 0 ? (
          <p>No boards created yet.</p>
        ) : (
          <ul>
            {boards.map((board) => (
              <li key={board._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <Link to={`/board/${board._id}`}>{board.name}</Link>
                <div>
                  <button onClick={() => handleDuplicateBoard(board._id)} style={{ marginLeft: '10px' }}>Duplicate</button>
                  <button onClick={() => handleDeleteBoard(board._id)} style={{ marginLeft: '10px', backgroundColor: 'red' }}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default HomePage;