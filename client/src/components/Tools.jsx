import React from 'react';

function Tools({ activeTool, setActiveTool, color, setColor, fillColor, setFillColor, lineWidth, setLineWidth, setElements }) {
  return (
    <div className="tool-box">
      <button
        className={activeTool === 'pencil' ? 'active' : ''}
        onClick={() => setActiveTool('pencil')}
      >
        Pencil
      </button>
      <button
        className={activeTool === 'rectangle' ? 'active' : ''}
        onClick={() => setActiveTool('rectangle')}
      >
        Rectangle
      </button>
      <button
        className={activeTool === 'circle' ? 'active' : ''}
        onClick={() => setActiveTool('circle')}
      >
        Circle
      </button>
      <button
        className={activeTool === 'stickyNote' ? 'active' : ''}
        onClick={() => setActiveTool('stickyNote')}
      >
        Sticky Note
      </button>
      <div>
        <label htmlFor="strokeColor">Stroke Color:</label>
        <input
          type="color"
          id="strokeColor"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="fillColor">Fill Color:</label>
        <input
          type="color"
          id="fillColor"
          value={fillColor}
          onChange={(e) => setFillColor(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="lineWidth">Line Width:</label>
        <input
          type="range"
          id="lineWidth"
          min="1"
          max="10"
          value={lineWidth}
          onChange={(e) => setLineWidth(parseInt(e.target.value))}
        />
        <span>{lineWidth}</span>
      </div>
      <button onClick={() => setElements(prev => prev.slice(0, prev.length - 1))}>Undo</button> {/* Basic Undo */}
      {/* Redo is more complex and usually involves a separate history array */}
      <button onClick={() => setElements([])}>Clear Canvas</button>
    </div>
  );
}

export default Tools;