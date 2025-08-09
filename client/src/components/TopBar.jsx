import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function TopBar({ boardId, saveBoard, exportBoard, importBoard, userName }) {
  const { logout } = useAuth();
  const importInputRef = useRef(null);

  const handleImportClick = () => {
    importInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      importBoard(file);
    }
  };

  return (
    <div className="top-bar">
      <div>
        <Link to="/">Home</Link>
        <span style={{ marginLeft: '20px' }}>Board ID: {boardId}</span>
      </div>
      <div>
        <button onClick={saveBoard}>Save Board</button>
        <button onClick={exportBoard} style={{ marginLeft: '10px' }}>Export as PNG</button>
        <input
          type="file"
          accept=".json"
          ref={importInputRef}
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <button onClick={handleImportClick} style={{ marginLeft: '10px' }}>Import Board</button>
        <span style={{ marginLeft: '20px' }}>Logged in as: {userName}</span>
        <button onClick={logout} style={{ marginLeft: '10px' }}>Logout</button>
      </div>
    </div>
  );
}

export default TopBar;