import React, { useRef, useState, useEffect } from 'react';

function StickyNote({ note, onUpdate, onDelete, scale, panOffset }) {
    const [isDragging, setIsDragging] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [initialNotePos, setInitialNotePos] = useState({ x: 0, y: 0 });
    const noteRef = useRef(null);

    // Update note position when props change (from external updates like Socket.IO)
    useEffect(() => {
        if (noteRef.current) {
            noteRef.current.style.left = `${(note.x + panOffset.x) * scale}px`;
            noteRef.current.style.top = `${(note.y + panOffset.y) * scale}px`;
            noteRef.current.style.width = `${note.width * scale}px`;
            noteRef.current.style.height = `${note.height * scale}px`;
            noteRef.current.querySelector('textarea').style.fontSize = `${16 * scale}px`; // Scale font
        }
    }, [note.x, note.y, note.width, note.height, scale, panOffset]);

    const handleMouseDown = (e) => {
        if (e.target === e.currentTarget || e.target.tagName === 'TEXTAREA') { // Only drag from note body, not delete button
            setIsDragging(true);
            setStartPos({ x: e.clientX, y: e.clientY });
            setInitialNotePos({ x: note.x, y: note.y });
            e.stopPropagation(); // Prevent canvas drag
        }
    };

    const handleMouseMove = (e) => {
        if (isDragging) {
            const dx = (e.clientX - startPos.x) / scale;
            const dy = (e.clientY - startPos.y) / scale;
            onUpdate({
                ...note,
                x: initialNotePos.x + dx,
                y: initialNotePos.y + dy,
            });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleTextChange = (e) => {
        onUpdate({ ...note, text: e.target.value });
    };

    const handleResize = () => {
        if (noteRef.current) {
            const newWidth = noteRef.current.offsetWidth / scale;
            const newHeight = noteRef.current.offsetHeight / scale;
            onUpdate({ ...note, width: newWidth, height: newHeight });
        }
    };

    useEffect(() => {
        const currentNoteRef = noteRef.current;
        if (currentNoteRef) {
            currentNoteRef.addEventListener('mousemove', handleMouseMove);
            currentNoteRef.addEventListener('mouseup', handleMouseUp);
            currentNoteRef.addEventListener('mouseleave', handleMouseUp); // Stop dragging if mouse leaves
            return () => {
                currentNoteRef.removeEventListener('mousemove', handleMouseMove);
                currentNoteRef.removeEventListener('mouseup', handleMouseUp);
                currentNoteRef.removeEventListener('mouseleave', handleMouseUp);
            };
        }
    }, [isDragging, note, onUpdate, scale]);


    return (
        <div
            ref={noteRef}
            className="sticky-note"
            style={{
                left: `${(note.x + panOffset.x) * scale}px`,
                top: `${(note.y + panOffset.y) * scale}px`,
                width: `${note.width * scale}px`,
                height: `${note.height * scale}px`,
                backgroundColor: note.fillColor,
                borderColor: note.color,
                zIndex: isDragging ? 2 : 1, // Bring to front when dragging
            }}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onResizeCapture={handleResize} // Capture resize event
        >
            <textarea
                value={note.text}
                onChange={handleTextChange}
                style={{ fontSize: `${16 * scale}px` }}
            />
            <button className="sticky-note-delete" onClick={() => onDelete(note.id)}>
                X
            </button>
        </div>
    );
}

export default StickyNote;