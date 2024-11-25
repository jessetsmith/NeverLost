import React, { useRef, useEffect, useContext, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls';
import { LayoutContext } from '../context/LayoutContext';

function ThreeDScene() {
    const mountRef = useRef(null);
    const { objects, updateObject, setSelectedObject } = useContext(LayoutContext);
    const [selectedObjectMesh, setSelectedObjectMesh] = useState(null);

    useEffect(() => {
        const currentMount = mountRef.current;

        // Scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf0f0f0);

        // Camera
        const camera = new THREE.PerspectiveCamera(
            75,
            currentMount.clientWidth / currentMount.clientHeight,
            0.1,
            1000
        );
        camera.position.set(5, 5, 5);

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
        currentMount.appendChild(renderer.domElement);

        // OrbitControls for user interaction
        const orbitControls = new OrbitControls(camera, renderer.domElement);
        orbitControls.enableDamping = true;

        // Grid Helper
        const gridHelper = new THREE.GridHelper(10, 10);
        scene.add(gridHelper);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 10);
        scene.add(directionalLight);

        // Raycaster and Mouse Vector for object selection
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        // TransformControls
        const transformControls = new TransformControls(camera, renderer.domElement);
        scene.add(transformControls);

        // Function to handle object selection
        const onMouseClick = (event) => {
            // Calculate mouse position in normalized device coordinates
            const rect = renderer.domElement.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            // Update the picking ray with the camera and mouse position
            raycaster.setFromCamera(mouse, camera);

            // Calculate objects intersecting the picking ray
            const intersects = raycaster.intersectObjects(scene.children.filter(child => child.userData.selectable));

            if (intersects.length > 0) {
                const intersected = intersects[0].object;
                setSelectedObject(intersected.userData.id);
                setSelectedObjectMesh(intersected);
                transformControls.attach(intersected);
                orbitControls.enabled = false; // Disable orbit when manipulating
            } else {
                setSelectedObject(null);
                setSelectedObjectMesh(null);
                transformControls.detach();
                orbitControls.enabled = true;
            }
        };

        // Add event listener for mouse clicks
        renderer.domElement.addEventListener('click', onMouseClick);

        // Disable orbitControls when using transformControls
        transformControls.addEventListener('dragging-changed', (event) => {
            orbitControls.enabled = !event.value;
        });

        // Listening to TransformControls events to update context
        transformControls.addEventListener('objectChange', () => {
            if (selectedObjectMesh) {
                const updatedObject = {
                    id: selectedObjectMesh.userData.id,
                    position: {
                        x: selectedObjectMesh.position.x,
                        y: selectedObjectMesh.position.y,
                        z: selectedObjectMesh.position.z,
                    },
                    rotation: {
                        x: selectedObjectMesh.rotation.x,
                        y: selectedObjectMesh.rotation.y,
                        z: selectedObjectMesh.rotation.z,
                    },
                    scale: {
                        x: selectedObjectMesh.scale.x,
                        y: selectedObjectMesh.scale.y,
                        z: selectedObjectMesh.scale.z,
                    },
                    // Add other properties if necessary
                };
                updateObject(updatedObject);
            }
        });

        // Add objects from context
        objects.forEach(obj => {
            let geometry;
            switch (obj.type) {
                case 'box':
                    geometry = new THREE.BoxGeometry(obj.scale.x, obj.scale.y, obj.scale.z);
                    break;
                case 'sphere':
                    geometry = new THREE.SphereGeometry(obj.scale.x, 32, 32);
                    break;
                // Add more object types as needed
                default:
                    geometry = new THREE.BoxGeometry(1, 1, 1);
            }
            const material = new THREE.MeshStandardMaterial({ color: obj.color || 0x00ff00 });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(obj.position.x, obj.position.y, obj.position.z);
            mesh.rotation.set(obj.rotation.x, obj.rotation.y, obj.rotation.z);
            mesh.userData = { id: obj.id, selectable: true }; // Mark as selectable
            scene.add(mesh);
        });

        // Animation Loop
        const animate = function () {
            requestAnimationFrame(animate);
            orbitControls.update();
            renderer.render(scene, camera);
        };

        animate();

        // Handle window resize
        const handleResize = () => {
            camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
        };
        window.addEventListener('resize', handleResize);

        // Cleanup on unmount
        return () => {
            window.removeEventListener('resize', handleResize);
            renderer.domElement.removeEventListener('click', onMouseClick);
            transformControls.dispose();
            orbitControls.dispose();
            renderer.dispose();
            scene.remove(transformControls);
            currentMount.removeChild(renderer.domElement);
        };
    }, [objects, selectedObjectMesh, updateObject, setSelectedObject]);

    return <div style={{ width: '100%', height: '100vh' }} ref={mountRef}></div>;
}

export default ThreeDScene;