import React from 'react';
import { Html } from '@react-three/drei';
import './SketchfabAssetCredit.css';

function CreditLink({ href, children }) {
    if (!href) return <span>{children}</span>;

    return (
        <a href={href} target="_blank" rel="noreferrer noopener">
            {children}
        </a>
    );
}

export function SketchfabCreditText({ credit, className = '' }) {
    if (!credit?.modelName || !credit?.authorName) return null;

    return (
        <p className={`sketchfab-credit-text ${className}`.trim()}>
            Based on{' '}
            <CreditLink href={credit.modelUrl}>{credit.modelName}</CreditLink>
            {' '}by{' '}
            <CreditLink href={credit.authorUrl}>{credit.authorName}</CreditLink>
            {credit.licenseLabel ? (
                <>
                    {' '}(
                    <CreditLink href={credit.licenseUrl}>{credit.licenseLabel}</CreditLink>
                    )
                </>
            ) : null}
            . Models provided by{' '}
            <a href="https://sketchfab.com" target="_blank" rel="noreferrer noopener">
                Sketchfab
            </a>
            .
        </p>
    );
}

function SketchfabAssetCredit({ credit, position, size = [1, 1, 1] }) {
    if (!credit?.modelName || !credit?.authorName) return null;

    const height = Array.isArray(size) ? size[1] ?? 1 : 1;
    const labelY = position[1] + height * 0.5 + 0.35;

    return (
        <Html
            position={[position[0], labelY, position[2]]}
            center
            distanceFactor={14}
            zIndexRange={[100, 0]}
            style={{ pointerEvents: 'auto' }}
        >
            <div className="sketchfab-asset-credit">
                <SketchfabCreditText credit={credit} />
            </div>
        </Html>
    );
}

export default SketchfabAssetCredit;
