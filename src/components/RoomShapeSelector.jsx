import React from 'react';
import { ROOM_SHAPES, getRoomShapePreset, isSquareLockedShape } from '../utils/roomShapes';

function ShapePreview({ shapeId }) {
    const preset = getRoomShapePreset(shapeId);
    const points = preset.points
        .map(([x, z]) => `${((x + 0.5) * 100).toFixed(1)},${((0.5 - z) * 100).toFixed(1)}`)
        .join(' ');

    return (
        <svg className="room-shape-preview" viewBox="0 0 100 100" aria-hidden="true">
            <polygon points={points} />
        </svg>
    );
}

function RoomShapeSelector({ dimensions, onChange, idPrefix = 'room-shape' }) {
    const handleShapeChange = (event) => {
        const roomShape = event.target.value;
        const next = { ...dimensions, roomShape };
        if (isSquareLockedShape(roomShape)) {
            next.depth = next.width;
        }
        onChange(next);
    };

    const preset = getRoomShapePreset(dimensions.roomShape);

    return (
        <div className="room-shape-selector">
            <div className="form-group">
                <label htmlFor={`${idPrefix}-select`}>Room shape</label>
                <select
                    id={`${idPrefix}-select`}
                    value={dimensions.roomShape}
                    onChange={handleShapeChange}
                >
                    {ROOM_SHAPES.map((shape) => (
                        <option key={shape.id} value={shape.id}>
                            {shape.label}
                        </option>
                    ))}
                </select>
            </div>
            <div className="room-shape-preview-wrap">
                <ShapePreview shapeId={dimensions.roomShape} />
                <p className="layout-dimensions-hint">{preset.description}</p>
            </div>
        </div>
    );
}

export default RoomShapeSelector;
