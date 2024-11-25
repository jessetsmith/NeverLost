import React, { useState, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useHelper } from '@react-three/drei';
import { DirectionalLightHelper } from 'three';
import { useParams, useNavigate } from 'react-router-dom';
import { useControls } from 'leva';
import * as THREE from 'three';
import Menu from './Menu';
import './LayoutView.css';
import axios from 'axios';

const API_URL = import.meta.env.VITE_APP_API_URL;

function LayoutView() {
    const { layoutId } = useParams();
    const navigate = useNavigate();
    const [cubes, setCubes] = useState([]);
    const [isWireframe, setIsWireframe] = useState(true);
    const selectedCube = useRef(null);
    const raycaster = useRef(new THREE.Raycaster());
    const mouse = useRef(new THREE.Vector2());

    useEffect(() => {
        const fetchLayout = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await axios.get(`${API_URL}/layouts/${layoutId}`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                setCubes(response.data.objects || []);
            } catch (error) {
                console.error("Error fetching layout:", error);
            }
        };

        fetchLayout();
    }, [layoutId]);

    const Plane = ({ position, size, color }) => {
        return (
            <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={size} />
                <meshStandardMaterial color={color} wireframe={isWireframe} />
            </mesh>
        );
    };

    const Cube = ({ position, color, onPointerDown }) => {
        return (
            <mesh position={position} onPointerDown={onPointerDown}>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial color={color} />
            </mesh>
        );
    };

    const Scene = () => {
        const directionalLightRef = useRef();
        useHelper(directionalLightRef, DirectionalLightHelper, 0.5, "white");

        const { lightColor, lightIntensity, wireframe } = useControls({
            lightColor: "white",
            lightIntensity: {
                value: 0.5,
                min: 0,
                max: 5,
                step: 0.1
            },
            wireframe: !isWireframe
        });

        setIsWireframe(wireframe);

        useFrame(({ camera, scene }) => {
            if (selectedCube.current) {
                raycaster.current.setFromCamera(mouse.current, camera);
                const intersects = raycaster.current.intersectObject(scene.children[0]); // Plane
                if (intersects.length > 0) {
                    const point = intersects[0].point;
                    selectedCube.current.position.set(point.x, 0.5, point.z);
                }
            }
        });

        return (
            <>
                <directionalLight
                    position={[0, 1, 2]}
                    intensity={lightIntensity}
                    ref={directionalLightRef}
                    color={lightColor}
                />
                <ambientLight intensity={0.7} />
                <Plane position={[0, 0, 0]} size={[5, 5]} color={"darkgrey"} />
                {cubes.map((cube, index) => (
                    <Cube
                        key={index}
                        position={cube.position}
                        color={cube.color}
                        onPointerDown={(e) => {
                            e.stopPropagation();
                            selectedCube.current = e.object;
                        }}
                    />
                ))}
                <OrbitControls />
            </>
        );
    };

    const handleEditClick = () => {
        navigate(`/layout/${layoutId}/edit`, { state: { cubes } });
    };

    return (
        <div className="layout-view-container">
            <div className='nav-container'>
                <Menu />
                <button className="edit-button" onClick={handleEditClick}>Edit Layout</button>
            </div>
            <div className="canvas-container">
                <Canvas
                    camera={{ position: [5, 5, 5], fov: 75 }} // Adjust camera position
                >
                    <Scene />
                </Canvas>
            </div>
        </div>
    );
}

export default LayoutView;