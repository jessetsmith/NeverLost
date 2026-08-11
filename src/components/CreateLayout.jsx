import React, { useState, useContext, useRef, useEffect } from 'react';
import axios from 'axios';
import { LayoutContext } from '../context/LayoutContext';
import { useNavigate } from 'react-router-dom';
import Menu from './Menu';
import LayoutDimensionsFields from './LayoutDimensionsFields';
import RoomShapeSelector from './RoomShapeSelector';
import WallControls from './WallControls';
import FloorplanPanel from './FloorplanPanel';
import { API_URL } from '../config/api';
import { v4 as uuidv4 } from 'uuid';
import {
    DEFAULT_LAYOUT_DIMENSIONS,
    normalizeLayoutDimensions,
    serializeLayoutDimensions,
} from '../utils/layoutDimensions';
import { isSquareLockedShape } from '../utils/roomShapes';
import { bindAutoHideScrollbar } from '../utils/autoHideScrollbar';
import './CreateLayout.css';

function CreateLayout() {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [layoutDimensions, setLayoutDimensions] = useState({ ...DEFAULT_LAYOUT_DIMENSIONS });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const dimensionsFieldsRef = useRef(null);
    const formRef = useRef(null);
    const { token } = useContext(LayoutContext);
    const navigate = useNavigate();

    useEffect(() => {
        if (formRef.current) {
            bindAutoHideScrollbar(formRef.current);
        }
    }, []);

    const getDefaultObjects = () => [
        {
            id: uuidv4(),
            type: 'cube',
            color: '#00f5d4',
            position: { x: 0, y: 0.5, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
        },
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!token) {
            setError('You must be logged in to create a layout.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const flushedDimensions = dimensionsFieldsRef.current?.flush?.() ?? layoutDimensions;
            const normalizedDimensions = normalizeLayoutDimensions(flushedDimensions);
            const response = await axios.post(`${API_URL}/layouts`, {
                name,
                description,
                objects: getDefaultObjects(),
                layoutDimensions: serializeLayoutDimensions(normalizedDimensions),
            }, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const { layoutId } = response.data;
            if (layoutId) {
                navigate(`/layout/${layoutId}/edit`, {
                    state: {
                        layoutDimensions: serializeLayoutDimensions(normalizedDimensions),
                    },
                });
            } else {
                setError('Layout created but no ID returned. Please try again.');
            }
        } catch (err) {
            console.error('Create layout error:', err);
            setError(err.response?.data?.error || err.message || 'Failed to create layout. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="app-shell create-layout-page">
            <Menu />
            <div className="app-main create-layout-main">
                <form ref={formRef} onSubmit={handleSubmit} className="auth-card create-layout-card scroll-auto-hide">
                    <h2>New Layout</h2>
                    <p className="auth-subtitle">Name your space and set real-world room dimensions</p>
                    {error && <p className="error-message">{error}</p>}
                    <div className="form-group">
                        <label htmlFor="name">Layout Name</label>
                        <input
                            type="text"
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            placeholder="My Room, Warehouse Floor…"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="description">Description</label>
                        <textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            required
                            placeholder="What's this layout for?"
                        />
                    </div>
                    <div className="create-layout-dimensions">
                        <h3 className="create-layout-section-heading">Room Size</h3>
                        <RoomShapeSelector
                            dimensions={layoutDimensions}
                            onChange={setLayoutDimensions}
                            idPrefix="create-room-shape"
                        />
                        <LayoutDimensionsFields
                            ref={dimensionsFieldsRef}
                            dimensions={layoutDimensions}
                            onChange={setLayoutDimensions}
                            lockDepthToWidth={isSquareLockedShape(layoutDimensions.roomShape)}
                            idPrefix="create-layout-dim"
                        />
                        <WallControls
                            dimensions={layoutDimensions}
                            onChange={setLayoutDimensions}
                            idPrefix="create-wall"
                        />
                    </div>
                    <div className="create-layout-floorplan">
                        <h3 className="create-layout-section-heading">Floorplan</h3>
                        <FloorplanPanel
                            dimensions={layoutDimensions}
                            onChange={setLayoutDimensions}
                        />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                        {loading ? 'Creating…' : 'Create Layout'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default CreateLayout;
