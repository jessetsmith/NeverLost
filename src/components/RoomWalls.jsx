import React, { useMemo } from 'react';

function buildWallSegments(outlinePoints, height) {
    const segments = [];
    for (let i = 0; i < outlinePoints.length; i += 1) {
        const [x1, z1] = outlinePoints[i];
        const [x2, z2] = outlinePoints[(i + 1) % outlinePoints.length];
        const dx = x2 - x1;
        const dz = z2 - z1;
        const length = Math.hypot(dx, dz);
        if (length < 0.001) continue;

        segments.push({
            length,
            position: [(x1 + x2) / 2, height / 2, (z1 + z2) / 2],
            rotationY: Math.atan2(dz, dx),
        });
    }
    return segments;
}

function RoomWalls({ outlinePoints, height, color, thickness, compact, ignoreRaycast = false }) {
    const segments = useMemo(
        () => buildWallSegments(outlinePoints, height),
        [outlinePoints, height],
    );

    return (
        <group>
            {segments.map((segment, index) => (
                <mesh
                    key={index}
                    position={segment.position}
                    rotation={[0, segment.rotationY, 0]}
                    castShadow={!compact}
                    receiveShadow={!compact}
                    raycast={ignoreRaycast ? () => null : undefined}
                >
                    <boxGeometry args={[segment.length, height, thickness]} />
                    <meshStandardMaterial color={color} roughness={0.88} metalness={0.04} />
                </mesh>
            ))}
        </group>
    );
}

export default RoomWalls;
