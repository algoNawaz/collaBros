import React, { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from 'react';
// >>> IMPORTANT CHANGE FOR UUID IMPORT:
import { v4 as uuidv4 } from "uuid/dist/esm-browser/index.js";
// <<< END IMPORTANT CHANGE
import StickyNote from './StickyNote';

const Canvas = forwardRef(({ boardState, setBoardState, socket, user, connectedUsers,boardId }, ref) => {
    const canvasRef = useRef(null);
    const contextRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [isPanning, setIsPanning] = useState(false);
    const [lastPanPos, setLastPanPos] = useState({ x: 0, y: 0 });
    const [history, setHistory] = useState([[]]); // Array of element states for undo/redo
    const [historyPointer, setHistoryPointer] = useState(0);
    const [shapeStart, setShapeStart] = useState(null);
    const [selectedElementId, setSelectedElementId] = useState(null);

    useImperativeHandle(ref, () => canvasRef.current); // Expose canvas DOM element

    const { elements, zoom, pan, activeTool, color, fillColor, lineWidth } = boardState;

    function isPointInElement(x, y, element) {
        if (element.type === 'rectangle' || element.type === 'stickyNote') {
            return (
                x >= element.x &&
                x <= element.x + element.width &&
                y >= element.y &&
                y <= element.y + element.height
            );
        } else if (element.type === 'circle') {
            const cx = element.x + element.width / 2;
            const cy = element.y + element.height / 2;
            const radius = element.width / 2;
            return Math.pow(x - cx, 2) + Math.pow(y - cy, 2) <= radius * radius;
        }
        // For path, you can add hit-testing if needed
        return false;
    }

    // Initialize Canvas and Context
    useEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        context.lineCap = 'round';
        context.lineJoin = 'round';
        contextRef.current = context;

        // Set initial canvas size
        canvas.width = window.innerWidth * 2; // Make it larger for more space
        canvas.height = window.innerHeight * 2;

        const handleResize = () => {
            canvas.width = window.innerWidth * 2;
            canvas.height = window.innerHeight * 2;
            drawCanvas(); // Redraw on resize to maintain content
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Draw grid
    const drawGrid = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = contextRef.current;
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear entire canvas

        const gridSize = 20 * zoom; // Grid size scales with zoom
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 0.5;

        // Draw vertical lines
        for (let x = pan.x % gridSize; x < canvas.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }

        // Draw horizontal lines
        for (let y = pan.y % gridSize; y < canvas.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
    }, [zoom, pan]);

    // Redraw canvas content
    const drawCanvas = useCallback(() => {
        const ctx = contextRef.current;
        const canvas = canvasRef.current;
        if (!ctx || !canvas) return;

        drawGrid(); // Redraw grid first

        ctx.save();
        ctx.translate(pan.x, pan.y);
        ctx.scale(zoom, zoom);

        elements.forEach(element => {
            if (element.type === 'path') {
                ctx.strokeStyle = element.color;
                ctx.lineWidth = element.lineWidth;
                const path = JSON.parse(element.path);
                if (path.length > 0) {
                    ctx.beginPath();
                    ctx.moveTo(path[0].x, path[0].y);
                    for (let i = 1; i < path.length; i++) {
                        ctx.lineTo(path[i].x, path[i].y);
                    }
                    ctx.stroke();
                }
            } else if (element.type === 'rectangle') {
                ctx.strokeStyle = element.color;
                ctx.fillStyle = element.fillColor;
                ctx.lineWidth = element.lineWidth;
                ctx.beginPath();
                ctx.rect(element.x, element.y, element.width, element.height);
                ctx.fill();
                ctx.stroke();
            } else if (element.type === 'circle') {
                ctx.strokeStyle = element.color;
                ctx.fillStyle = element.fillColor;
                ctx.lineWidth = element.lineWidth;
                ctx.beginPath();
                ctx.arc(element.x + element.width / 2, element.y + element.height / 2, element.width / 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }

            if (element.id === selectedElementId) {
                ctx.save();
                ctx.strokeStyle = 'blue';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                if (element.type === 'rectangle' || element.type === 'stickyNote') {
                    ctx.rect(element.x, element.y, element.width, element.height);
                } else if (element.type === 'circle') {
                    ctx.arc(
                        element.x + element.width / 2,
                        element.y + element.height / 2,
                        element.width / 2,
                        0, Math.PI * 2
                    );
                }
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.restore();
            }
            // Sticky notes are rendered as separate React components, not on canvas
        });

        ctx.restore();
    }, [elements, zoom, pan, drawGrid, selectedElementId]);

    // Draw whenever elements, zoom, or pan change
    useEffect(() => {
        drawCanvas();
    }, [drawCanvas]);


    // Handle Undo/Redo (Local State for performance)
    const saveStateToHistory = useCallback((currentElements) => {
        const newHistory = history.slice(0, historyPointer + 1);
        newHistory.push(currentElements);
        setHistory(newHistory);
        setHistoryPointer(newHistory.length - 1);
    }, [history, historyPointer]);

    const undo = useCallback(() => {
        if (historyPointer > 0) {
            const newPointer = historyPointer - 1;
            setHistoryPointer(newPointer);
            setBoardState(prevState => ({ ...prevState, elements: history[newPointer] }));
        }
    }, [history, historyPointer, setBoardState]);

    const redo = useCallback(() => {
        if (historyPointer < history.length - 1) {
            const newPointer = historyPointer + 1;
            setHistoryPointer(newPointer);
            setBoardState(prevState => ({ ...prevState, elements: history[newPointer] }));
        }
    }, [history, historyPointer, setBoardState]);

    // Keyboard shortcuts for undo/redo
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                undo();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                redo();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo]);


    // Convert mouse coordinates to canvas coordinates (considering pan and zoom)
    const getCanvasCoordinates = useCallback((clientX, clientY) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const x = (clientX - rect.left - pan.x) / zoom;
        const y = (clientY - rect.top - pan.y) / zoom;
        return { x, y };
    }, [pan, zoom]);

    // Selection handler
    const handleSelect = useCallback((e) => {
        if (activeTool !== 'select') return;
        const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);
        // Find topmost element under cursor
        for (let i = elements.length - 1; i >= 0; i--) {
            if (isPointInElement(x, y, elements[i])) {
                setSelectedElementId(elements[i].id);
                return;
            }
        }
        setSelectedElementId(null);
    }, [activeTool, elements, getCanvasCoordinates]);

    useEffect(() => {
        const canvas = canvasRef.current;
        canvas.addEventListener('mousedown', handleSelect);
        return () => {
            canvas.removeEventListener('mousedown', handleSelect);
        };
    }, [handleSelect]);

    // Mouse down handler
    const startDrawing = useCallback((e) => {
        if (e.button !== 0) return;
        const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);
        const ctx = contextRef.current;

        if (activeTool === 'pencil') {
            setIsDrawing(true);
            ctx.beginPath();
            ctx.moveTo(x, y);

            const newPathId = uuidv4();
            setBoardState(prevState => ({
                ...prevState,
                elements: [
                    ...prevState.elements,
                    {
                        id: newPathId,
                        type: 'path',
                        path: JSON.stringify([{ x, y }]),
                        color,
                        lineWidth,
                    },
                ],
            }));
            socket.emit('drawing', {
                boardId: boardId,
                id: newPathId,
                type: 'path',
                path: JSON.stringify([{ x, y }]),
                color,
                lineWidth,
            });
        } else if (activeTool === 'rectangle' || activeTool === 'circle') {
            setIsDrawing(true);
            setShapeStart({ x, y });
            const newShapeId = uuidv4();
            setBoardState(prevState => ({
                ...prevState,
                elements: [
                    ...prevState.elements,
                    {
                        id: newShapeId,
                        type: activeTool,
                        x, y,
                        width: 0,
                        height: 0,
                        color,
                        fillColor,
                        lineWidth,
                    },
                ],
            }));
        } else if (activeTool === 'stickyNote') {
            const newNoteId = uuidv4();
            const newNote = {
                id: newNoteId,
                type: 'stickyNote',
                x, y,
                width: 200,
                height: 100,
                color: '#000000', // Border color
                fillColor: '#ffffa0', // Sticky note color
                text: 'New Note',
            };
            setBoardState(prevState => ({
                ...prevState,
                elements: [...prevState.elements, newNote],
            }));
            socket.emit('stickyNote', { boardId: boardState.boardId, ...newNote });
            saveStateToHistory([...elements, newNote]);
            setBoardState(prevState => ({ ...prevState, activeTool: 'select' })); // Switch back to pencil
        }
    }, [activeTool, color, fillColor, lineWidth, setBoardState, socket, boardState.boardId, elements, getCanvasCoordinates, saveStateToHistory]);

    // Mouse move handler
    const draw = useCallback((e) => {
        if (e.buttons !== 1) { // If mouse button is not pressed, just update cursor
            const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);
            if (socket) {
                socket.emit('cursorMove', { boardId: boardState.boardId, x, y, username: user.username });
            }
            return;
        }

        const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);
        const ctx = contextRef.current;

        if (isDrawing && (activeTool === 'pencil' || activeTool === 'rectangle' || activeTool === 'circle')) {
            setBoardState(prevState => {
                const updatedElements = [...prevState.elements];
                const currentElement = updatedElements[updatedElements.length - 1];

                if (activeTool === 'pencil') {
                    ctx.lineTo(x, y);
                    ctx.stroke();
                    const currentPath = JSON.parse(currentElement.path);
                    currentPath.push({ x, y });
                    currentElement.path = JSON.stringify(currentPath);
                } else if (activeTool === 'rectangle') {
                    currentElement.x = Math.min(shapeStart.x, x);
                    currentElement.y = Math.min(shapeStart.y, y);
                    currentElement.width = Math.abs(x - shapeStart.x);
                    currentElement.height = Math.abs(y - shapeStart.y);
                } else if (activeTool === 'circle') {
                    const dx = x - shapeStart.x;
                    const dy = y - shapeStart.y;
                    const radius = Math.sqrt(dx * dx + dy * dy);
                    currentElement.x = shapeStart.x - radius; // Adjust x to be top-left of bounding box
                    currentElement.y = shapeStart.y - radius; // Adjust y to be top-left of bounding box
                    currentElement.width = radius * 2; // Store diameter as width
                    currentElement.height = radius * 2; // Store diameter as height
                }

                socket.emit('drawing', { boardId: boardState.boardId, ...currentElement });
                return { ...prevState, elements: updatedElements };
            });
        }
    }, [isDrawing, activeTool, socket, boardState.boardId, setBoardState, getCanvasCoordinates, user, shapeStart]);


    // Mouse up handler
    const stopDrawing = useCallback(() => {
        if (isDrawing) {
            setIsDrawing(false);
            setShapeStart(null);
            contextRef.current.closePath();
            // Save state to history only after a complete drawing action
            saveStateToHistory(boardState.elements);
        }
    }, [isDrawing, boardState.elements, saveStateToHistory]);

    // Mouse Pan Controls
    const startPan = useCallback((e) => {
        if (e.button === 2 || activeTool === 'select') { // Middle click or 'hand' tool
            setIsPanning(true);
            setLastPanPos({ x: e.clientX, y: e.clientY });
            e.preventDefault(); // Prevent default drag behavior
        }
    }, [activeTool]);

    const panCanvas = useCallback((e) => {
        if (!isPanning) return;
        const dx = e.clientX - lastPanPos.x;
        const dy = e.clientY - lastPanPos.y;

        setBoardState(prevState => ({
            ...prevState,
            pan: {
                x: prevState.pan.x + dx,
                y: prevState.pan.y + dy
            }
        }));
        setLastPanPos({ x: e.clientX, y: e.clientY });
    }, [isPanning, lastPanPos, setBoardState]);

    const stopPan = useCallback(() => {
        setIsPanning(false);
    }, []);

    // Zoom Controls
    const handleWheel = useCallback((e) => {
        e.preventDefault();
        const scaleAmount = 1.1;
        let newZoom = zoom;
        if (e.deltaY < 0) { // Zoom in
            newZoom *= scaleAmount;
        } else { // Zoom out
            newZoom /= scaleAmount;
        }

        // Clamp zoom to reasonable range
        newZoom = Math.max(0.1, Math.min(5, newZoom));

        // Adjust pan to zoom towards mouse cursor
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const newPanX = mouseX - ((mouseX - pan.x) / zoom) * newZoom;
        const newPanY = mouseY - ((mouseY - pan.y) / zoom) * newZoom;

        setBoardState(prevState => ({
            ...prevState,
            zoom: newZoom,
            pan: { x: newPanX, y: newPanY }
        }));
    }, [zoom, pan, setBoardState]);


    // Attach event listeners
    useEffect(() => {
        const canvas = canvasRef.current;
        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('mouseleave', stopDrawing); // Important for when mouse leaves canvas
        canvas.addEventListener('contextmenu', (e) => e.preventDefault()); // Prevent right-click context menu
        canvas.addEventListener('mousedown', startPan);
        canvas.addEventListener('mousemove', panCanvas);
        canvas.addEventListener('mouseup', stopPan);
        canvas.addEventListener('mouseleave', stopPan);
        canvas.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            canvas.removeEventListener('mousedown', startDrawing);
            canvas.removeEventListener('mousemove', draw);
            canvas.removeEventListener('mouseup', stopDrawing);
            canvas.removeEventListener('mouseleave', stopDrawing);
            canvas.removeEventListener('contextmenu', (e) => e.preventDefault());
            canvas.removeEventListener('mousedown', startPan);
            canvas.removeEventListener('mousemove', panCanvas);
            canvas.removeEventListener('mouseup', stopPan);
            canvas.removeEventListener('mouseleave', stopPan);
            canvas.removeEventListener('wheel', handleWheel);
        };
    }, [startDrawing, draw, stopDrawing, startPan, panCanvas, stopPan, handleWheel]);


    // Update sticky note
    const updateStickyNote = useCallback((updatedNote) => {
        setBoardState(prevState => {
            const updatedElements = prevState.elements.map(el =>
                el.id === updatedNote.id && el.type === 'stickyNote' ? updatedNote : el
            );
            return { ...prevState, elements: updatedElements };
        });
        socket.emit('stickyNote', { boardId: boardState.boardId, ...updatedNote });
        saveStateToHistory(boardState.elements); // Save state after update
    }, [setBoardState, socket, boardState.boardId, elements, saveStateToHistory]);

    // Delete sticky note
    const deleteStickyNote = useCallback((id) => {
        setBoardState(prevState => {
            const filteredElements = prevState.elements.filter(el => el.id !== id);
            return { ...prevState, elements: filteredElements };
        });
        saveStateToHistory(boardState.elements); // Save state after delete
        // TODO: Emit deletion via socket if needed
    }, [setBoardState, elements, saveStateToHistory]);

    return (
        <div className="canvas-container">
            <canvas ref={canvasRef} style={{ display: 'block' }}></canvas>
            {elements.map(element => (
                element.type === 'stickyNote' && (
                    <StickyNote
                        key={element.id}
                        note={element}
                        onUpdate={updateStickyNote}
                        onDelete={deleteStickyNote}
                        scale={zoom}
                        panOffset={pan}
                    />
                )
            ))}

            {/* Render other users' cursors */}
            {Object.entries(connectedUsers).map(([userId, cursor]) => (
                userId !== socket?.id && ( // Don't render current user's cursor
                    <div
                        key={userId}
                        className="cursor"
                        style={{
                            left: `${(cursor.x + pan.x) * zoom}px`,
                            top: `${(cursor.y + pan.y) * zoom}px`,
                        }}
                    >
                        <div className="cursor-dot" style={{ backgroundColor: 'blue' }}></div> {/* Example color for other cursors */}
                        {cursor.username}
                    </div>
                )
            ))}
        </div>
    );
});

export default Canvas;