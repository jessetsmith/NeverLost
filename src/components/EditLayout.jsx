import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, TransformControls } from '@react-three/drei';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Menu from './Menu';
import './EditLayout.css';
import axios from 'axios';

const API_URL = import.meta.env.VITE_APP_API_URL;

function EditLayout() {
    const { layoutId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [objects, setObjects] = useState(location.state?.objects || []);
    const [isWireframe, setIsWireframe] = useState(false);
    const [shapeType, setShapeType] = useState('cube'); // State for shape selection
    const [selectedObject, setSelectedObject] = useState(null); // Lifted state for selected object
    const [showSuccessMessage, setShowSuccessMessage] = useState(false); // State for success message

    // Ref for TransformControls and OrbitControls
    const orbitControlsRef = useRef();
    const transformControlsRef = useRef();

    // Fetch layout data if not passed via navigation state
    useEffect(() => {
        if (!location.state?.objects) {
            const fetchLayout = async () => {
                try {
                    const token = localStorage.getItem('token');
                    const response = await axios.get(`${API_URL}/layouts/${layoutId}`, {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    });
                    setObjects(response.data.objects || []);
                } catch (error) {
                    console.error("Error fetching layout:", error);
                }
            };
            fetchLayout();
        }
    }, [layoutId, location.state]);

    const handleSaveClick = async () => {
        try {
            const token = localStorage.getItem('token');
            console.log(objects);
            await axios.put(`${API_URL}/layouts/${layoutId}`, { objects }, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            setShowSuccessMessage(true); // Show success message
            setTimeout(() => setShowSuccessMessage(false), 3000); // Hide after 3 seconds
            navigate(`/layout/${layoutId}`); // Navigate to the layout view after saving
        } catch (error) {
            console.error("Error saving layout:", error);
        }
    };

    const handleEndEditing = () => {
        navigate(`/layout/${layoutId}`, { state: { objects } });
    };

    const addShape = () => {
        const newShape = {
            id: Date.now(), // Unique identifier for each shape
            type: shapeType,
            position: [0, 0.5, 0],
            color: "#708090", // Default color set to slate grey
            size: shapeType === 'sphere' ? [1] : [1, 1, 1], // Adjust size based on shape type
        };
        setObjects([...objects, newShape]);
    };

    const removeSelectedShape = (id) => {
        const updatedObjects = objects.filter(obj => obj.id !== id);
        setObjects(updatedObjects);
        setSelectedObject(null); // Deselect if the selected object is removed
    };

    // Handler to update object properties from side panel
    const updateSelectedObject = (property, value) => {
        if (!selectedObject) return;

        const updatedObjects = objects.map(obj => {
            if (obj.id === selectedObject.id) {
                return { ...obj, [property]: value };
            }
            return obj;
        });

        setObjects(updatedObjects);

        // Update the local selectedObject state
        setSelectedObject(updatedObjects.find(obj => obj.id === selectedObject.id));
    };

    // Handler to update object after TransformControls
    const handleObjectChange = useCallback(() => {
        if (selectedObject) {
            const updatedObjects = objects.map(obj => {
                if (obj.id === selectedObject.id) {
                    return {
                        ...obj,
                        position: [
                            parseFloat(selectedObject.mesh.position.x.toFixed(2)),
                            parseFloat(selectedObject.mesh.position.y.toFixed(2)),
                            parseFloat(selectedObject.mesh.position.z.toFixed(2))
                        ],
                        // Optionally update rotation and scale if needed
                    };
                }
                return obj;
            });
            setObjects(updatedObjects);
        }
    }, [selectedObject, objects]);

    return (
        <div className="edit-layout-container">
            {showSuccessMessage && <div className="success-message">Layout saved successfully!</div>}
            <div className='nav-container'>
                <Menu />
                <div className="buttons">
                    <button className="add-shape-button" onClick={addShape}>Add Shape</button>
                    <button className="save-button" onClick={handleSaveClick}>Save Layout</button>
                    <button className="end-editing-button" onClick={handleEndEditing}>End Editing</button>
                </div>
            </div>
            <div className="main-content">
                <div className="side-panel" id="side-panel">
                    <h2>Shape Controls</h2>
                    <label htmlFor="shape-select">Choose Shape:</label>
                    <select
                        id="shape-select"
                        value={shapeType}
                        onChange={(e) => setShapeType(e.target.value)}
                    >
                        <option value="cube">Cube</option>
                        <option value="sphere">Sphere</option>
                        <option value="rectangle">Rectangle</option>
                        {/* Add more shape options as needed */}
                    </select>

                    {selectedObject ? (
                        <div className="shape-controls">
                            <h3>Edit Shape</h3>
                            <label>
                                Color:
                                <input
                                    type="color"
                                    value={selectedObject.color}
                                    onChange={(e) => updateSelectedObject('color', e.target.value)}
                                />
                            </label>
                            {/* Size Controls Based on Shape Type */}
                            {selectedObject.type === 'cube' || selectedObject.type === 'rectangle' ? (
                                <>
                                    <label>
                                        Width:
                                        <input
                                            type="number"
                                            value={selectedObject.size[0]}
                                            onChange={(e) => {
                                                const newWidth = parseFloat(e.target.value);
                                                updateSelectedObject('size', [newWidth, selectedObject.size[1], selectedObject.size[2]]);
                                            }}
                                        />
                                    </label>
                                    <label>
                                        Height:
                                        <input
                                            type="number"
                                            value={selectedObject.size[1]}
                                            onChange={(e) => {
                                                const newHeight = parseFloat(e.target.value);
                                                updateSelectedObject('size', [selectedObject.size[0], newHeight, selectedObject.size[2]]);
                                            }}
                                        />
                                    </label>
                                    <label>
                                        Length:
                                        <input
                                            type="number"
                                            value={selectedObject.size[2]}
                                            onChange={(e) => {
                                                const newDepth = parseFloat(e.target.value);
                                                updateSelectedObject('size', [selectedObject.size[0], selectedObject.size[1], newDepth]);
                                            }}
                                        />
                                    </label>
                                </>
                            ) : selectedObject.type === 'sphere' ? (
                                <label>
                                    Radius:
                                    <input
                                        type="number"
                                        value={selectedObject.size[0]}
                                        onChange={(e) => {
                                            const newRadius = parseFloat(e.target.value);
                                            updateSelectedObject('size', [newRadius]);
                                        }}
                                    />
                                </label>
                            ) : null}
                            <button className="remove-shape-button" onClick={() => removeSelectedShape(selectedObject.id)}>Remove Shape</button>
                            <button className="deselect-button" onClick={() => setSelectedObject(null)}>Deselect</button>
                        </div>
                    ) : (
                        <p>Select a shape to edit its properties.</p>
                    )}

                    <h3>Shapes in Scene</h3>
                    <ul className="shape-list">
                        {objects.map((object) => (
                            <li
                                key={object.id}
                                className={selectedObject && selectedObject.id === object.id ? 'selected' : ''}
                                onClick={() => setSelectedObject(object)}
                            >
                                {object.type} - {object.id}
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="canvas-container">
                    <Canvas shadows camera={{ position: [10, 10, 10], fov: 75 }}>
                        <Scene
                            objects={objects}
                            setObjects={setObjects}
                            isWireframe={isWireframe}
                            setIsWireframe={setIsWireframe}
                            selectedObject={selectedObject}
                            setSelectedObject={setSelectedObject}
                            handleObjectChange={handleObjectChange}
                            orbitControlsRef={orbitControlsRef}
                            transformControlsRef={transformControlsRef}
                        />
                    </Canvas>
                </div>
            </div>
        </div>
    );
}

function Scene({
    objects,
    setObjects,
    isWireframe,
    setIsWireframe,
    selectedObject,
    setSelectedObject,
    handleObjectChange,
    orbitControlsRef,
    transformControlsRef
}) {
    return (
        <>
            <directionalLight
                position={[0, 1, 2]}
                intensity={1}
                castShadow
            />
            <ambientLight intensity={0.5} />
            <Plane position={[0, 0, 0]} size={[10, 10]} />
            {objects.map((object) => (
                <Shape
                    key={object.id}
                    object={object}
                    onSelect={setSelectedObject}
                />
            ))}
            <OrbitControls ref={orbitControlsRef} enabled={!selectedObject} />
            {selectedObject && selectedObject.mesh && (
                <TransformControls
                    ref={transformControlsRef}
                    object={selectedObject.mesh}
                    mode="translate"
                    onMouseDown={() => {
                        orbitControlsRef.current.enabled = false;
                    }}
                    onMouseUp={() => {
                        orbitControlsRef.current.enabled = true;
                        handleObjectChange();
                    }}
                    onDragEnd={() => {
                        handleObjectChange();
                    }}
                />
            )}
            {/* Handle clicking outside to deselect */}
            <mesh
                onClick={(e) => {
                    e.stopPropagation();
                    setSelectedObject(null);
                }}
                position={[0, -1000, 0]}
            >
                <planeGeometry args={[10000, 10000]} />
                <meshBasicMaterial transparent opacity={0} />
            </mesh>
        </>
    );
}

function Plane({ position, size }) {
    return (
        <mesh
            position={position}
            rotation={[-Math.PI / 2, 0, 0]}
            receiveShadow
            onClick={(e) => e.stopPropagation()} // Prevent the plane from being selectable
        >
            <planeGeometry args={size} />
            <meshStandardMaterial color="#D3D3D3" wireframe={false} /> {/* Light grey color */}
        </mesh>
    );
}

function Shape({ object, onSelect }) {
    const meshRef = useRef();

    useEffect(() => {
        if (meshRef.current) {
            meshRef.current.userData.id = object.id;
            object.mesh = meshRef.current; // Assign mesh reference to the object
        }
    }, [object.id, object]);

    const { type, position, color, size } = object;

    const geometryProps = () => {
        switch (type) {
            case 'cube':
                return <boxGeometry args={size} />;
            case 'sphere':
                return <sphereGeometry args={[size[0] / 2, 32, 32]} />;
            case 'rectangle':
                return <boxGeometry args={size} />;
            // Add more shapes as needed
            default:
                return <boxGeometry args={size} />;
        }
    };

    return (
        <mesh
            ref={meshRef}
            position={position}
            onClick={(e) => {
                e.stopPropagation(); // Prevent event bubbling to the plane or other objects
                onSelect(object); // Pass the entire object for selection
            }}
            castShadow
            receiveShadow
        >
            {geometryProps()}
            <meshStandardMaterial color={color} wireframe={false} />
        </mesh>
    );
}

export default EditLayout;
