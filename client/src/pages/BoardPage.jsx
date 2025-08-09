import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Canvas from '../components/Canvas';
import Tools from '../components/Tools';
import TopBar from '../components/TopBar';
import axios from 'axios';
import io from 'socket.io-client';

const initialBoardState = {
  elements: [], // Array to store all drawing elements and sticky notes
  zoom: 1,
  pan: { x: 0, y: 0 },
  activeTool: 'pencil',
  color: '#000000',
  fillColor: '#FFFFFF',
  lineWidth: 2,
};

function BoardPage() {
  const { boardId } = useParams();
  const { user } = useAuth();
  const [boardState, setBoardState] = useState(initialBoardState);
  const [socket, setSocket] = useState(null);
  const [connectedUsers, setConnectedUsers] = useState({}); // To store other users' cursors

  const canvasRef = useRef(null); // Ref to the canvas element in Canvas.jsx

  // Establish Socket.IO connection
  useEffect(() => {
    if (!user) return;

    const newSocket = io('http://localhost:5000', {
      query: { token: user.token, username: user.username },
    });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to socket server');
      newSocket.emit('joinBoard', boardId);
    });

    newSocket.on('drawing', (data) => {
      setBoardState(prevState => {
        const newElements = prevState.elements.map(el =>
          el.id === data.id ? { ...el, ...data } : el
        );
        // If element doesn't exist, add it (e.g., initial path segment)
        if (!newElements.some(el => el.id === data.id)) {
          newElements.push(data);
        }
        return { ...prevState, elements: newElements };
      });
    });

    newSocket.on('stickyNote', (data) => {
      setBoardState(prevState => {
        const newElements = prevState.elements.map(el =>
          el.id === data.id ? { ...el, ...data } : el
        );
        if (!newElements.some(el => el.id === data.id)) {
          newElements.push(data);
        }
        return { ...prevState, elements: newElements };
      });
    });

    newSocket.on('cursorMove', (data) => {
      setConnectedUsers(prevUsers => ({
        ...prevUsers,
        [data.userId]: { x: data.x, y: data.y, username: data.username }
      }));
    });

    newSocket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });

    return () => newSocket.close();
  }, [boardId, user]);

  // Fetch board data on load
  useEffect(() => {
    const fetchBoard = async () => {
      try {
        const config = {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        };
        const res = await axios.get(`http://localhost:5000/api/boards/${boardId}`, config);
        setBoardState(prevState => ({ ...prevState, elements: res.data.elements || [] }));
      } catch (error) {
        console.error('Error fetching board:', error.response ? error.response.data.message : error.message);
        // Handle error, e.g., redirect to home
      }
    };

    if (user && boardId) {
      fetchBoard();
    }
  }, [boardId, user]);


  // Save board periodically or on explicit save action
  const saveBoard = async () => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
      };
      await axios.put(`http://localhost:5000/api/boards/${boardId}`, { elements: boardState.elements }, config);
      console.log('Board saved successfully!');
    } catch (error) {
      console.error('Error saving board:', error.response ? error.response.data.message : error.message);
    }
  };

  const handleExportAsImage = async () => {
    if (!canvasRef.current) return;

    const dataURL = canvasRef.current.toDataURL('image/png'); // Get base64 image data
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
      };
      const res = await axios.post(`http://localhost:5000/api/boards/export/${boardId}`, { imageData: dataURL }, config);
      alert(`Board exported! Check server exports folder. Filename: ${res.data.filename}`);
    } catch (error) {
      console.error('Error exporting board:', error.response ? error.response.data.message : error.message);
      alert('Failed to export board.');
    }
  };

  const handleImportBoard = (jsonFile) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        if (importedData && Array.isArray(importedData.elements)) {
          setBoardState(prevState => ({ ...prevState, elements: importedData.elements }));
          alert('Board imported successfully!');
        } else {
          alert('Invalid JSON file format for board import.');
        }
      } catch (error) {
        alert('Error parsing JSON file. Please ensure it\'s a valid board JSON.');
        console.error('Error importing board:', error);
      }
    };
    reader.readAsText(jsonFile);
  };

  return (
    <div className="board-page">
      <TopBar
        boardId={boardId}
        saveBoard={saveBoard}
        exportBoard={handleExportAsImage}
        importBoard={handleImportBoard}
        userName={user?.username}
      />
      <div style={{ display: 'flex', flexGrow: 1 }}>
        <Tools
          activeTool={boardState.activeTool}
          setActiveTool={(tool) => setBoardState(prevState => ({ ...prevState, activeTool: tool }))}
          color={boardState.color}
          setColor={(color) => setBoardState(prevState => ({ ...prevState, color }))}
          fillColor={boardState.fillColor}
          setFillColor={(color) => setBoardState(prevState => ({ ...prevState, fillColor }))}
          lineWidth={boardState.lineWidth}
          setLineWidth={(width) => setBoardState(prevState => ({ ...prevState, lineWidth: width }))}
          setElements={(elements) => setBoardState(prevState => ({ ...prevState, elements }))} // For undo/redo
        />
            <Canvas
        ref={canvasRef}
        boardId={boardId} // <-- ADD THIS PROP
        boardState={boardState}
        setBoardState={setBoardState}
        socket={socket}
        user={user}
        connectedUsers={connectedUsers}
    />
      </div>
    </div>
  );
}

export default BoardPage;